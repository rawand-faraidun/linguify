import { commands, type ExtensionContext, type LogOutputChannel, Uri, window, workspace } from 'vscode'
import { configFileName, extensionCommands, extensionDisplayName, extensionText, fileScheme } from '@linguify/constants'
import {
	diffCommand,
	exportCommand,
	formatCommand,
	importCommand,
	type ProjectCommand,
	runCommand,
	syncCommand
} from './commands'
import { openPanel, panelsDisposable, projectChanged } from './panel'

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
	context.subscriptions.push(
		log,
		panelsDisposable(),
		commands.registerCommand(extensionCommands.open, async () => {
			const folder = await findProject()
			if (folder === undefined) {
				await window.showErrorMessage(extensionText.noConfig)
				return
			}
			openPanel(context, folder, log)
		}),
		...Object.entries({
			[extensionCommands.sync]: syncCommand,
			[extensionCommands.format]: formatCommand,
			[extensionCommands.diff]: diffCommand,
			[extensionCommands.export]: exportCommand,
			[extensionCommands.import]: importCommand
		}).map(([name, command]) => commands.registerCommand(name, () => onProject(log, command)))
	)
	log.info(`${extensionDisplayName} is active`)
}

/**
 * runs a palette command on the workspace's project, and has its open panel read the files again when the
 * command wrote them
 *
 * @param log - the extension's log
 * @param command - the command
 */
const onProject = async (log: LogOutputChannel, command: ProjectCommand) => {
	const folder = await findProject()
	if (folder === undefined) {
		await window.showErrorMessage(extensionText.noConfig)
		return
	}
	if (await runCommand(folder, log, command)) projectChanged(folder)
}

/**
 * the folder of the project to open: of the configs in the workspace, the one nearest a workspace folder's
 * root — the same one every time
 *
 * @note only configs on this machine's disk: in a virtual workspace a path would name another file here
 *
 * @note several configs, and a workspace opened below its config, wait on 13.7's choice of project
 *
 * @returns the folder holding the config, or `undefined` when the workspace has none
 */
const findProject = async (): Promise<Uri | undefined> => {
	const configs = (await workspace.findFiles(`**/${configFileName}`, '**/node_modules/**')).filter(
		config => config.scheme === fileScheme
	)
	const depth = (config: Uri) => workspace.asRelativePath(config, false).split('/').length
	const [nearest] = configs.sort((a, b) => depth(a) - depth(b) || a.fsPath.localeCompare(b.fsPath))
	return nearest === undefined ? undefined : Uri.joinPath(nearest, '..')
}
