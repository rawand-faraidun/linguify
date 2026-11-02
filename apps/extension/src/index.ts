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
	settingsPrefix
} from '@linguify/constants'
import {
	diffCommand,
	exportCommand,
	formatCommand,
	importCommand,
	type ProjectCommand,
	runCommand,
	syncCommand
} from './commands'
import { openPanel, panelsDisposable, panelsOpen, projectChanged, reloadPanels, restorePanel } from './panel'

/**
 * starts the extension — when a workspace holds a linguify config, or one of its commands is run
 *
 * @note everything it creates goes into the context's subscriptions, so the editor disposes of it when the
 * extension stops — the open panels included
 *
 * @param context - the extension's context, from the editor
 */
export const activate = (context: ExtensionContext) => {
	const log = window.createOutputChannel(extensionDisplayName, { log: true })
	const onProject = async (command: ProjectCommand) => {
		const folder = await chooseProject(context)
		if (folder !== undefined && (await runCommand(folder, log, command))) projectChanged(folder)
	}
	context.subscriptions.push(
		log,
		panelsDisposable(),
		commands.registerCommand(extensionCommands.open, async () => {
			const folder = await chooseProject(context)
			if (folder !== undefined) openPanel(context, folder, log)
		}),
		commands.registerCommand(extensionCommands.chooseProject, async () => {
			await context.workspaceState.update(chosenProjectKey, undefined)
			const folder = await chooseProject(context)
			if (folder !== undefined) openPanel(context, folder, log)
		}),
		...Object.entries({
			[extensionCommands.sync]: syncCommand,
			[extensionCommands.format]: formatCommand,
			[extensionCommands.diff]: diffCommand,
			[extensionCommands.export]: exportCommand,
			[extensionCommands.import]: importCommand
		}).map(([name, command]) => commands.registerCommand(name, () => onProject(command))),
		// a panel open when the editor reloaded comes back on its project — only one the workspace still holds
		window.registerWebviewPanelSerializer(panelViewType, {
			deserializeWebviewPanel: async (panel, state: unknown) => {
				const kept = typeof state === 'object' && state !== null ? (state as { folder?: unknown }).folder : undefined
				const folder = (await projectFolders()).find(project => project.toString() === kept)
				if (folder === undefined) panel.dispose()
				else restorePanel(context, panel, folder, log)
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
 * once for the workspace and remembered, `Linguify: Choose Project` asking again
 *
 * @param context - the extension's context
 *
 * @returns the folder holding its config; `undefined` when there is none, said, or the choice was dismissed
 */
const chooseProject = async (context: ExtensionContext): Promise<Uri | undefined> => {
	const folders = await projectFolders()
	if (folders.length === 0) {
		await window.showErrorMessage(extensionText.noConfig)
		return undefined
	}
	if (folders.length === 1) return folders[0]
	const remembered = context.workspaceState.get<string>(chosenProjectKey)
	const kept = folders.find(folder => folder.toString() === remembered)
	if (kept !== undefined) return kept
	const picked = await window.showQuickPick(
		folders.map(folder => ({
			label: basename(folder.fsPath),
			description: workspace.asRelativePath(folder, true),
			folder
		})),
		{ title: extensionText.chooseProject, placeHolder: extensionText.chooseProjectHint }
	)
	if (picked === undefined) return undefined
	await context.workspaceState.update(chosenProjectKey, picked.folder.toString())
	return picked.folder
}

/**
 * every project in the workspace: the folders holding a config, nearest a workspace folder's root first
 *
 * @note only configs on this machine's disk: in a virtual workspace a path would name another file here
 *
 * @returns the folders
 */
const projectFolders = async (): Promise<Uri[]> => {
	const configs = (await workspace.findFiles(`**/${configFileName}`, '**/node_modules/**')).filter(
		config => config.scheme === fileScheme
	)
	const depth = (config: Uri) => workspace.asRelativePath(config, false).split('/').length
	return configs
		.sort((a, b) => depth(a) - depth(b) || a.fsPath.localeCompare(b.fsPath))
		.map(config => Uri.joinPath(config, '..'))
}
