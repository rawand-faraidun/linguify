import type { bridgeCallKinds, bridgeChangedType, bridgeMessageType } from '@linguify/constants'
import type { Values } from './values'

/**
 * a call the webview makes to the extension host: one API procedure, by its path, with its input
 */
export type BridgeRequest = {
	type: typeof bridgeMessageType

	/**
	 * the page load the call is from — fresh for each, as the editor reloads a hidden panel's page, and a
	 * reply to the last load's call must not land on this one's
	 */
	session: string

	/**
	 * the call's number within its page load, which its reply carries back
	 */
	id: number

	/**
	 * the procedure's path — `catalogue.get`
	 */
	path: string

	kind: Values<typeof bridgeCallKinds>
	input: unknown
}

/**
 * the host's answer to a {@link BridgeRequest}: what the procedure returned, or the error the API shaped —
 * as a tRPC response carries them, so the webview's client reads both as it would over HTTP
 */
export type BridgeReply = {
	type: typeof bridgeMessageType
	session: string
	id: number
	envelope: { result: { data: unknown } } | { error: unknown }
}

/**
 * what the host tells a panel when a palette command has written its project's files, so it reads them again
 * rather than learn of it from a refused write
 */
export type BridgeChanged = {
	type: typeof bridgeChangedType
}
