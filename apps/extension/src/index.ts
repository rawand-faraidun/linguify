import { type ExtensionContext, window } from 'vscode'
import { extensionDisplayName } from '@linguify/constants'

/**
 * starts the extension — when a workspace holds a linguify config, or one of its commands is run
 *
 * @note everything it creates goes into the context's subscriptions, so the editor disposes of it when the
 * extension stops
 *
 * @param context - the extension's context, from the editor
 */
export const activate = (context: ExtensionContext) => {
	const log = window.createOutputChannel(extensionDisplayName, { log: true })
	context.subscriptions.push(log)
	log.info(`${extensionDisplayName} is active`)
}
