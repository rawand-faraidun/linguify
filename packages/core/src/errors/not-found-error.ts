import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the codes a {@link NotFoundError} carries
 */
export type NotFoundErrorCode =
	| typeof errorCodes.namespaceNotFound
	| typeof errorCodes.keyNotFound
	| typeof errorCodes.localeUnknown

/**
 * the named namespace, key or locale does not exist
 */
export class NotFoundError extends LinguifyError<NotFoundErrorCode> {
	override name = 'NotFoundError'
}
