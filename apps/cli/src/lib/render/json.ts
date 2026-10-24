import { generatedFileFormat } from '@linguify/constants'
import { formatJson } from '@linguify/core'
import type { SerializedError } from '@linguify/types'

/**
 * what `--json` prints: one object, success or failure, and nothing else
 */
export type JsonEnvelope<T> = { ok: true; data: T } | { ok: false; error: SerializedError }

/**
 * @param envelope - the outcome
 *
 * @returns it as JSON text, ending in a newline, with nothing a terminal would act on
 */
export const renderJson = <T>(envelope: JsonEnvelope<T>): string =>
	formatJson(envelope, generatedFileFormat).replace(
		rawInJson,
		character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
	)

/**
 * what `JSON.stringify` leaves raw but a terminal acts on — DEL, the C1 controls (U+009B starts an escape
 * sequence on its own) and the bidi controls; written as `\\uXXXX`, they read back as the same text
 */
const rawInJson = /[\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g
