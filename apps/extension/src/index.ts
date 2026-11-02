import { basename } from 'node:path'
import { commands, type ExtensionContext, Uri, window, workspace } from 'vscode'
import {
	chosenProjectKey,
	configFileName,
	extensionCommands,
	extensionDisplayName,
	extensionText,
	fileScheme,
	panelViewType,
	projectSearchExcludes,
	projectSearchLimit,
	settingsPrefix
} from '@linguify/constants'
import {
	diffCommand,
	exportCommand,
	formatCommand,
	importCommand,
	type ProjectCommand,
	runCommand,
	say,
	syncCommand
} from './commands'
import { openPanel, panelsDisposable, panelsOpen, projectChanged, reloadPanels, restorePanel } from './panel'

/**
 * starts the extension — when a workspace holds a linguify config, or one of its commands is run
 *
 * @note what it creates goes into the context's subscriptions, so the editor disposes of it when the
 * extension stops — the panels' listeners, not the panels, which the editor keeps to restore after a reload
 *
 * @param context - the extension's context, from the editor
 */
export const activate = (context: ExtensionContext) => {
	const log = window.createOutputChannel(extensionDisplayName, { log: true })
	// a failure before a command reaches its project — finding it, asking which — said in linguify's way too
	const guarded = (task: () => Promise<void>) => async () => {
		try {
			await task()
		} catch (error) {
			log.error(error instanceof Error ? error : String(error))
			say('error', error instanceof Error ? error.message : String(error))
		}
	}
	const onProject = (command: ProjectCommand) =>
		guarded(async () => {
			const project = await chooseProject(context)
			if (project !== undefined && (await runCommand(project.folder, project.name, log, command)))
				projectChanged(project.folder)
		})
	context.subscriptions.push(
		log,
		panelsDisposable(),
		commands.registerCommand(
			extensionCommands.open,
			guarded(async () => {
				const project = await chooseProject(context)
				if (project !== undefined) openPanel(context, project.folder, log)
			})
		),
		commands.registerCommand(
			extensionCommands.chooseProject,
			guarded(async () => {
				const project = await chooseProject(context, true)
				if (project !== undefined) openPanel(context, project.folder, log)
			})
		),
		...Object.entries({
			[extensionCommands.sync]: syncCommand,
			[extensionCommands.format]: formatCommand,
			[extensionCommands.diff]: diffCommand,
			[extensionCommands.export]: exportCommand,
			[extensionCommands.import]: importCommand
		}).map(([name, command]) => commands.registerCommand(name, onProject(command))),
		// a panel open when the editor reloaded comes back on its project — only one the workspace still holds
		window.registerWebviewPanelSerializer(panelViewType, {
			deserializeWebviewPanel: async (panel, state: unknown) => {
				try {
					const kept = typeof state === 'object' && state !== null ? (state as { folder?: unknown }).folder : undefined
					const folder = (await projectFolders()).find(project => project.toString() === kept)
					if (folder === undefined) panel.dispose()
					else restorePanel(context, panel, folder, log)
				} catch (error) {
					// the workspace not ready to search: no panel rather than an empty one
					log.error(error instanceof Error ? error : String(error))
					panel.dispose()
				}
			}
		}),
		workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(settingsPrefix)) void offerReload(context)
		})
	)
	log.info(`${extensionDisplayName} is active`)
}

/**
 * whether the settings-changed question is on screen, so a second change does not ask again
 */
let offering = false

/**
 * asks once, while a panel is open, whether to draw it again with the person's changed settings — the
 * palette's commands read them afresh each time anyway
 *
 * @param context - the extension's context
 */
const offerReload = async (context: ExtensionContext) => {
	if (offering || !panelsOpen()) return
	offering = true
	const chosen = await window.showInformationMessage(extensionText.settingsChanged, extensionText.reload)
	offering = false
	if (chosen === extensionText.reload) reloadPanels(context)
}

/**
 * the project to work on: the workspace's only one, or — with several — the one the person chose, asked
 * once for the workspace and remembered; `Linguify: Choose Project` asks again, the choice kept unless
 * another is made
 *
 * @param context - the extension's context
 * @param ask - whether to ask even when a choice is kept
 *
 * @returns the folder holding its config, and its name when there are several; nothing when there is none,
 * said, or the question was dismissed
 */
const chooseProject = async (
	context: ExtensionContext,
	ask = false
): Promise<{ folder: Uri; name: string | undefined } | undefined> => {
	const folders = await projectFolders()
	const [only] = folders
	if (only === undefined) {
		say('error', extensionText.noConfig)
		return undefined
	}
	if (folders.length === 1) return { folder: only, name: undefined }
	const remembered = context.workspaceState.get<string>(chosenProjectKey)
	const kept = folders.find(folder => folder.toString() === remembered)
	if (kept !== undefined && !ask) return { folder: kept, name: basename(kept.fsPath) }
	const picked = await window.showQuickPick(
		folders.map(folder => ({
			label: basename(folder.fsPath),
			description: workspace.asRelativePath(folder, true),
			picked: folder === kept,
			folder
		})),
		{ title: extensionText.chooseProject, placeHolder: extensionText.chooseProjectHint }
	)
	if (picked === undefined) return undefined
	await context.workspaceState.update(chosenProjectKey, picked.folder.toString())
	return { folder: picked.folder, name: basename(picked.folder.fsPath) }
}

/**
 * every project in the workspace: the folders holding a config, nearest a workspace folder's root first —
 * else, when none is at or below the folders opened, the nearest above each, as the CLI searches up
 *
 * @note only configs on this machine's disk: in a virtual workspace a path would name another file here.
 * Dependencies, builds and the repository's own folder are not searched
 *
 * @returns the folders
 */
const projectFolders = async (): Promise<Uri[]> => {
	const configs = (await workspace.findFiles(`**/${configFileName}`, projectSearchExcludes, projectSearchLimit)).filter(
		config => config.scheme === fileScheme
	)
	const depth = (config: Uri) => workspace.asRelativePath(config, false).split('/').length
	const below = configs
		.sort((a, b) => depth(a) - depth(b) || a.fsPath.localeCompare(b.fsPath))
		.map(config => Uri.joinPath(config, '..'))
	if (below.length > 0) return below
	const above: Uri[] = []
	for (const opened of workspace.workspaceFolders ?? []) {
		if (opened.uri.scheme !== fileScheme) continue
		const found = await configAbove(opened.uri)
		if (found !== undefined && !above.some(folder => folder.toString() === found.toString())) above.push(found)
	}
	return above
}

/**
 * @param folder - a folder opened in the editor
 *
 * @returns the nearest folder above it holding a config, or nothing
 */
const configAbove = async (folder: Uri): Promise<Uri | undefined> => {
	let at = Uri.joinPath(folder, '..')
	while (true) {
		const exists = await workspace.fs.stat(Uri.joinPath(at, configFileName)).then(
			() => true,
			() => false
		)
		if (exists) return at
		const parent = Uri.joinPath(at, '..')
		if (parent.fsPath === at.fsPath) return undefined
		at = parent
	}
}
