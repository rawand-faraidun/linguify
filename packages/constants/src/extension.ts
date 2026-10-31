import { appName } from './app'

/**
 * the prefix of every editor setting, so options read as `linguify.studio.port`
 */
export const settingsPrefix = appName

/**
 * joins a setting's parts — the prefix, then the config's path to the option
 */
export const settingSeparator = '.'

/**
 * how far each editor setting reaches: per folder, so each root of a multi-root workspace can have its own
 */
export const settingScope = 'resource'

/**
 * the command palette entries the extension contributes
 */
export const extensionCommands = {
	open: `${appName}.open`,
	sync: `${appName}.sync`,
	format: `${appName}.format`,
	diff: `${appName}.diff`,
	export: `${appName}.export`,
	import: `${appName}.import`
} as const

/**
 * the scheme of a file on this machine's disk — the only kind linguify reads and writes
 */
export const fileScheme = 'file'

/**
 * the webview panel's view type, which the editor uses to restore it after a reload
 */
export const panelViewType = `${appName}.panel`

/**
 * the words the extension's commands are shown with in the palette, after its name — `Linguify: Open`
 */
export const extensionCommandTitles = {
	open: 'Open'
} as const

/**
 * the webview's built files: the folder inside the extension's `dist`, and the script and stylesheet in it —
 * fixed names, as the host writes the page that loads them
 */
export const webviewFiles = {
	folder: 'webview',
	script: 'webview.js',
	style: 'webview.css'
} as const

/**
 * the extension's words on screen
 */
export const extensionText = {
	noConfig: 'No linguify config in this workspace. Run `linguify init` in a terminal, then open Linguify again.',
	reading: 'Reading the translations…',
	key: 'Key'
} as const

/**
 * the API procedures the webview may call — reads and changes within the project. `export` and `import`
 * name files anywhere, and `init` creates a project, so the host runs those itself, with the file the person
 * picks in the editor's own dialog: a page that could name any path could write or read any file
 */
export const bridgeProcedures: readonly string[] = [
	'config.get',
	'catalogue.get',
	'list.locales',
	'list.namespaces',
	'list.keys',
	'diff',
	'key.add',
	'key.set',
	'key.rename',
	'key.remove',
	'namespace.add',
	'namespace.rename',
	'namespace.remove',
	'sync',
	'format'
]

/**
 * the kinds of call the webview makes to the host: a read, or a write
 */
export const bridgeCallKinds = {
	query: 'query',
	mutation: 'mutation'
} as const

/**
 * the tag on every message between the webview and the extension host
 *
 * @note lets each side ignore messages that other code posts on the same channel
 */
export const bridgeMessageType = `${appName}:rpc`
