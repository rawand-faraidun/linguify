import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the code an {@link UnexpectedError} carries
 */
export type UnexpectedErrorCode = typeof errorCodes.unexpected

/**
 * a failure linguify did not anticipate, wrapped so it still crosses every boundary with a code
 */
export class UnexpectedError extends LinguifyError<UnexpectedErrorCode> {
	override name = 'UnexpectedError'
}
