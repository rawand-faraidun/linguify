import { errorCodes } from '@linguify/constants'
import type { ErrorCode } from '@linguify/types'
import type { Expect } from '../utils/type-checks'
import type { ConfigErrorCode } from './config-error'
import type { ConflictErrorCode } from './conflict-error'
import type { EngineErrorCode } from './engine-error'
import { LinguifyError } from './linguify-error'
import type { NotFoundErrorCode } from './not-found-error'
import { UnexpectedError, type UnexpectedErrorCode } from './unexpected-error'
import type { ValidationErrorCode } from './validation-error'

/**
 * every code some error class carries
 */
export type ClassifiedErrorCode =
	| ConfigErrorCode
	| ConflictErrorCode
	| EngineErrorCode
	| NotFoundErrorCode
	| UnexpectedErrorCode
	| ValidationErrorCode

/**
 * compiles only while every error code belongs to a class
 *
 * @note a code added to `@linguify/constants` without a class turns this into a type error, so no
 * code can reach a surface that has no idea how to treat it
 */
export type EveryErrorCodeIsClassified = Expect<
	[Exclude<ErrorCode, ClassifiedErrorCode>] extends [never] ? true : false
>

/**
 * turns anything thrown into a {@link LinguifyError}
 *
 * @param error - whatever was thrown
 *
 * @returns the error itself when it is already one, otherwise an {@link UnexpectedError} wrapping it
 */
export const toLinguifyError = (error: unknown): LinguifyError =>
	error instanceof LinguifyError
		? error
		: new UnexpectedError(messageOf(error), { code: errorCodes.unexpected, cause: error })

/**
 * @param error - whatever was thrown
 *
 * @returns its message, when it has one, otherwise its string form
 */
const messageOf = (error: unknown): string => {
	if (error instanceof Error) return error.message
	if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
		return error.message
	return String(error)
}
