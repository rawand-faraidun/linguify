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
 * @returns it as JSON text, ending in a newline
 */
export const renderJson = <T>(envelope: JsonEnvelope<T>): string => formatJson(envelope, generatedFileFormat)
