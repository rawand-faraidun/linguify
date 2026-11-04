import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the codes a {@link ConflictError} carries
 */
export type ConflictErrorCode =
	| typeof errorCodes.namespaceExists
	| typeof errorCodes.keyExists
	| typeof errorCodes.keyNotAssignable
	| typeof errorCodes.staleCatalogue
	| typeof errorCodes.portInUse

/**
 * something is already in the way: an existing namespace or key, a translation blocking a nested
 * key, files changed on disk since they were read, or a taken port
 */
export class ConflictError extends LinguifyError<ConflictErrorCode> {
	override name = 'ConflictError'
}
