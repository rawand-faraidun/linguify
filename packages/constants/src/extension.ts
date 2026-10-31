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
 * the webview panel's view type, which the editor uses to restore it after a reload
 */
export const panelViewType = `${appName}.panel`

/**
 * the tag on every message between the webview and the extension host
 *
 * @note lets each side ignore messages that other code posts on the same channel
 */
export const bridgeMessageType = `${appName}:rpc`
