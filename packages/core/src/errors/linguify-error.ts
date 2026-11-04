import type { ErrorCode, ErrorDetails, SerializedError } from '@linguify/types'

/**
 * {@link LinguifyError} options
 */
export type LinguifyErrorOptions<Code extends ErrorCode = ErrorCode> = {
	/**
	 * the code every surface branches on
	 */
	code: Code

	/**
	 * structured facts about the failure
	 */
	details?: ErrorDetails

	/**
	 * the error that caused this one
	 */
	cause?: unknown
}

/**
 * base of every error linguify throws
 *
 * @note surfaces branch on `code`, never on the class or the message, because only the code
 * survives a trip through `--json`, tRPC or a webview message
 */
export class LinguifyError<Code extends ErrorCode = ErrorCode> extends Error {
	override name = 'LinguifyError'

	/**
	 * the code every surface branches on
	 */
	readonly code: Code

	/**
	 * structured facts about the failure, when there are any
	 */
	readonly details: ErrorDetails | undefined

	/**
	 * @param message - human-readable message
	 * @param options - error options
	 */
	constructor(message: string, { code, details, cause }: LinguifyErrorOptions<Code>) {
		super(message, cause === undefined ? undefined : { cause })
		this.code = code
		this.details = details
	}

	/**
	 * the error as it crosses a boundary
	 *
	 * @note `JSON.stringify` calls this; without it an error serialises to `{}`, since `message` is
	 * not enumerable
	 *
	 * @returns the code, the message and any details
	 */
	toJSON(): SerializedError {
		return { code: this.code, message: this.message, ...(this.details === undefined ? {} : { details: this.details }) }
	}
}
