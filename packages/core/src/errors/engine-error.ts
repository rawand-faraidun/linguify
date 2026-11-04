import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the codes an {@link EngineError} carries
 */
export type EngineErrorCode =
	| typeof errorCodes.engineUnknown
	| typeof errorCodes.fileInvalid
	| typeof errorCodes.invalidStructure

/**
 * the engine is unknown, or a translation file cannot be read as that engine's format
 */
export class EngineError extends LinguifyError<EngineErrorCode> {
	override name = 'EngineError'
}
