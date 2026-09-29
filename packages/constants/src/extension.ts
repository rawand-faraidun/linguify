import { appName } from './app'

/**
 * the prefix of every editor setting, so options read as `linguify.studio.port`
 */
export const settingsPrefix = appName

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
 * the webview panel's view type, which the editor uses to restore it after a reload
 */
export const panelViewType = `${appName}.panel`

/**
 * the tag on every message between the webview and the extension host
 *
 * @note lets each side ignore messages that other code posts on the same channel
 */
export const bridgeMessageType = `${appName}:rpc`
