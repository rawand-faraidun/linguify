import { randomBytes } from 'node:crypto'
import { basename } from 'node:path'
import {
	type Disposable,
	type ExtensionContext,
	type LogOutputChannel,
	Uri,
	ViewColumn,
	type WebviewOptions,
	type WebviewPanel,
	window
} from 'vscode'
import { answerBridge } from '@linguify/api'
import { bridgeChangedType, extensionDisplayName, panelViewType, webviewFiles } from '@linguify/constants'
import type { BridgeChanged } from '@linguify/types'
import { editorLayer } from '../settings'
import { panelHtml } from './html'

/**
 * the open panels, by the folder whose config each shows — one each — with that folder
 */
const panels = new Map<string, { panel: WebviewPanel; folder: Uri }>()

/**
 * closes every open panel — when the extension stops
 *
 * @returns what disposes of them
 */
export const panelsDisposable = (): Disposable => ({
	dispose: () => {
		for (const { panel } of panels.values()) panel.dispose()
	}
})

/**
 * @returns whether any panel is open
 */
export const panelsOpen = (): boolean => panels.size > 0

/**
 * shows the translation table for the project whose config is in `folder` — revealed when it is open
 * already
 *
 * @param context - the extension's context
 * @param folder - the folder holding the project's config
 * @param log - the extension's log
 */
export const openPanel = (context: ExtensionContext, folder: Uri, log: LogOutputChannel) => {
	const open = panels.get(folder.toString())
	if (open !== undefined) {
		open.panel.reveal()
		return
	}
	const panel = window.createWebviewPanel(panelViewType, titleOf(folder), ViewColumn.Active, optionsOf(context))
	showProject(context, panel, folder, log)
}

/**
 * takes back a panel the editor restored after a reload, on the project it showed
 *
 * @param context - the extension's context
 * @param panel - the panel the editor restored
 * @param folder - the folder holding the project's config, as the page kept it
 * @param log - the extension's log
 */
export const restorePanel = (context: ExtensionContext, panel: WebviewPanel, folder: Uri, log: LogOutputChannel) => {
	if (panels.has(folder.toString())) {
		panel.dispose()
		return
	}
	panel.webview.options = optionsOf(context)
	panel.title = titleOf(folder)
	showProject(context, panel, folder, log)
}

/**
 * draws every open panel's page afresh — once the person asks, after their settings changed — each keeping
 * its view, filters and scroll through the page's own state
 *
 * @param context - the extension's context
 */
export const reloadPanels = (context: ExtensionContext) => {
	for (const { panel, folder } of panels.values()) panel.webview.html = pageOf(context, panel, folder)
}

/**
 * tells the panel open on a project, if any, that a palette command wrote its files, so it reads them again
 *
 * @param folder - the folder holding the project's config
 */
export const projectChanged = (folder: Uri) => {
	const changed: BridgeChanged = { type: bridgeChangedType }
	void panels.get(folder.toString())?.panel.webview.postMessage(changed)
}

/**
 * shows a project in a panel and answers its page
 *
 * @note the webview reaches the project only through {@link answerBridge}, called here in the host for
 * each message it posts, with the editor layer as the person's settings stand then: no server, no port. It
 * may load only the extension's own built files. A call still running when the panel closes is not
 * answered, and one that fails in the host is logged, not lost
 *
 * @param context - the extension's context
 * @param panel - the panel
 * @param folder - the folder holding the project's config
 * @param log - the extension's log
 */
const showProject = (context: ExtensionContext, panel: WebviewPanel, folder: Uri, log: LogOutputChannel) => {
	const key = folder.toString()
	const { webview } = panel
	webview.html = pageOf(context, panel, folder)
	let disposed = false
	const listeners: Disposable[] = [
		webview.onDidReceiveMessage(async (message: unknown) => {
			try {
				const reply = await answerBridge(message, { cwd: folder.fsPath, editor: editorLayer(folder) })
				if (reply !== undefined && !disposed) await webview.postMessage(reply)
			} catch (error) {
				log.error(error instanceof Error ? error : String(error))
			}
		}),
		panel.onDidDispose(() => {
			disposed = true
			panels.delete(key)
			for (const listener of listeners) listener.dispose()
		})
	]
	panels.set(key, { panel, folder })
}

/**
 * @param context - the extension's context
 *
 * @returns the folder the webview's files are in, the only one it may load from
 */
const filesOf = (context: ExtensionContext) => Uri.joinPath(context.extensionUri, 'dist', webviewFiles.folder)

/**
 * @param context - the extension's context
 *
 * @returns the panel's options: scripts on, forms off, only the webview's own files loadable
 */
const optionsOf = (context: ExtensionContext): WebviewOptions => ({
	enableScripts: true,
	enableForms: false,
	localResourceRoots: [filesOf(context)]
})

/**
 * @param folder - the folder holding the project's config
 *
 * @returns the panel's title — the extension's name and the folder's
 */
const titleOf = (folder: Uri) => `${extensionDisplayName}: ${basename(folder.fsPath)}`

/**
 * @param context - the extension's context
 * @param panel - the panel
 * @param folder - the folder holding the project's config
 *
 * @returns the page, with a fresh nonce, naming the folder so a reload can restore it
 */
const pageOf = (context: ExtensionContext, panel: WebviewPanel, folder: Uri) => {
	const { webview } = panel
	const files = filesOf(context)
	return panelHtml({
		cspSource: webview.cspSource,
		nonce: randomBytes(16).toString('base64'),
		script: webview.asWebviewUri(Uri.joinPath(files, webviewFiles.script)).toString(),
		style: webview.asWebviewUri(Uri.joinPath(files, webviewFiles.style)).toString(),
		title: titleOf(folder),
		folder: folder.toString()
	})
}
