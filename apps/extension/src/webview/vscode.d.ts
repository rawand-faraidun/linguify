/**
 * what the editor gives a webview: a way to post to the extension host, and state kept while hidden
 */
type VsCodeApi = {
	postMessage: (message: unknown) => void
	getState: () => unknown
	setState: (state: unknown) => void
}

/**
 * the editor's handle for this webview — it may be taken once per page
 */
declare function acquireVsCodeApi(): VsCodeApi
