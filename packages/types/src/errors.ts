import type { errorCodes } from '@linguify/constants'
import type { Values } from './values'

/**
 * a code carried by every linguify error
 */
export type ErrorCode = Values<typeof errorCodes>

/**
 * structured facts about an error — the path, the locale, the conflicting key — so a surface can
 * render it without parsing the message
 */
export type ErrorDetails = Record<string, unknown>

/**
 * an error as it crosses a boundary: `--json` output, a tRPC response, a webview message
 */
export type SerializedError = {
	code: ErrorCode
	message: string
	details?: ErrorDetails
}
