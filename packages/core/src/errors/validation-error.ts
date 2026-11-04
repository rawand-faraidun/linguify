import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the codes a {@link ValidationError} carries
 */
export type ValidationErrorCode =
	| typeof errorCodes.invalidInput
	| typeof errorCodes.namespacesDisabled
	| typeof errorCodes.descriptionsDisabled
	| typeof errorCodes.importInvalid
	| typeof errorCodes.confirmationRequired

/**
 * the request itself cannot be carried out as given — invalid input, a feature turned off, an
 * unreadable import, or a missing confirmation
 */
export class ValidationError extends LinguifyError<ValidationErrorCode> {
	override name = 'ValidationError'
}
