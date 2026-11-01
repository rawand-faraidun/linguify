import { randomBytes } from 'node:crypto'
import { basename } from 'node:path'
import {
	type Disposable,
	type ExtensionContext,
	type LogOutputChannel,
	Uri,
	ViewColumn,
	type WebviewPanel,
	window
} from 'vscode'
import { answerBridge } from '@linguify/api'
import { bridgeChangedType, extensionDisplayName, panelViewType, webviewFiles } from '@linguify/constants'
import type { BridgeChanged } from '@linguify/types'
import { panelHtml } from './html'

/**
 * the open panels, by the folder whose config each shows — one each
 */
const panels = new Map<string, WebviewPanel>()

/**
 * closes every open panel — when the extension stops
 *
 * @returns what disposes of them
 */
export const panelsDisposable = (): Disposable => ({
	dispose: () => {
		for (const panel of panels.values()) panel.dispose()
	}
})

/**
 * shows the translation table for the project whose config is in `folder` — revealed when it is open
 * already
 *
 * @note the webview reaches the project only through {@link answerBridge}, called here in the host for
 * each message it posts: no server, no port. It may load only the extension's own built files. A call still
 * running when the panel closes is not answered, and one that fails in the host is logged, not lost
 *
 * @param context - the extension's context
 * @param folder - the folder holding the project's config
 * @param log - the extension's log
 */
export const openPanel = (context: ExtensionContext, folder: Uri, log: LogOutputChannel) => {
	const key = folder.toString()
	const open = panels.get(key)
	if (open !== undefined) {
		open.reveal()
		return
	}
	const files = Uri.joinPath(context.extensionUri, 'dist', webviewFiles.folder)
	const title = `${extensionDisplayName}: ${basename(folder.fsPath)}`
	const panel = window.createWebviewPanel(panelViewType, title, ViewColumn.Active, {
		enableScripts: true,
		enableForms: false,
		localResourceRoots: [files]
	})
	const { webview } = panel
	webview.html = panelHtml({
		cspSource: webview.cspSource,
		nonce: randomBytes(16).toString('base64'),
		script: webview.asWebviewUri(Uri.joinPath(files, webviewFiles.script)).toString(),
		style: webview.asWebviewUri(Uri.joinPath(files, webviewFiles.style)).toString(),
		title
	})
	let disposed = false
	const listeners: Disposable[] = [
		webview.onDidReceiveMessage(async (message: unknown) => {
			try {
				const reply = await answerBridge(message, { cwd: folder.fsPath })
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
	panels.set(key, panel)
}

/**
 * tells the panel open on a project, if any, that a palette command wrote its files, so it reads them again
 *
 * @param folder - the folder holding the project's config
 */
export const projectChanged = (folder: Uri) => {
	const changed: BridgeChanged = { type: bridgeChangedType }
	void panels.get(folder.toString())?.webview.postMessage(changed)
}
