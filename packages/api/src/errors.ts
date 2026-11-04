import { errorCodes } from '@linguify/constants'
import { LinguifyError, toLinguifyError, ValidationError } from '@linguify/core'
import type { ErrorCode } from '@linguify/types'
import { TRPCError } from '@trpc/server'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'

/**
 * the tRPC code — and so the HTTP status — each linguify error code is sent with
 *
 * @note keyed by every code, so adding one to `@linguify/constants` fails to compile until it is placed
 * here. A stale revision is `PRECONDITION_FAILED`, HTTP's own answer to "the thing changed since you
 * read it"; project files linguify cannot use are `UNPROCESSABLE_CONTENT`
 */
const transportCodes: Record<ErrorCode, TRPCError['code']> = {
	[errorCodes.configNotFound]: 'NOT_FOUND',
	[errorCodes.configInvalid]: 'UNPROCESSABLE_CONTENT',
	[errorCodes.configExists]: 'CONFLICT',
	[errorCodes.engineUnknown]: 'UNPROCESSABLE_CONTENT',
	[errorCodes.fileInvalid]: 'UNPROCESSABLE_CONTENT',
	[errorCodes.invalidStructure]: 'UNPROCESSABLE_CONTENT',
	[errorCodes.staleCatalogue]: 'PRECONDITION_FAILED',
	[errorCodes.invalidInput]: 'BAD_REQUEST',
	[errorCodes.localeUnknown]: 'NOT_FOUND',
	[errorCodes.namespacesDisabled]: 'BAD_REQUEST',
	[errorCodes.namespaceNotFound]: 'NOT_FOUND',
	[errorCodes.namespaceExists]: 'CONFLICT',
	[errorCodes.keyNotFound]: 'NOT_FOUND',
	[errorCodes.keyExists]: 'CONFLICT',
	[errorCodes.keyNotAssignable]: 'CONFLICT',
	[errorCodes.descriptionsDisabled]: 'BAD_REQUEST',
	[errorCodes.importInvalid]: 'UNPROCESSABLE_CONTENT',
	[errorCodes.confirmationRequired]: 'BAD_REQUEST',
	[errorCodes.portInUse]: 'CONFLICT',
	[errorCodes.unexpected]: 'INTERNAL_SERVER_ERROR'
}

/**
 * one problem with an input, as a schema reports it
 */
type InputIssue = {
	path?: readonly (PropertyKey | { key: PropertyKey })[]
	message: string
}

/**
 * recovers the linguify error behind anything a procedure call threw
 *
 * @note an input the procedure's schema refused becomes `INVALID_INPUT`, with each problem's path — so a
 * surface can point at the field. A request tRPC itself refused — malformed JSON, an unknown procedure,
 * a query sent as a mutation — is `INVALID_INPUT` too: a caller's mistake, not `UNEXPECTED`, which
 * means a bug
 *
 * @param error - what the call threw, or what tRPC wrapped it in
 *
 * @returns the linguify error; anything unforeseen is `UNEXPECTED`
 */
export const toApiError = (error: unknown): LinguifyError => {
	if (!(error instanceof TRPCError)) return toLinguifyError(error)
	const issues = inputIssues(error.cause)
	if (error.code === 'BAD_REQUEST' && issues !== undefined) {
		const listed = issues.map(({ path = [], message }) => {
			const at = path.map(segment => String(typeof segment === 'object' ? segment.key : segment)).join('.')
			return { path: at, message }
		})
		return new ValidationError(
			`Invalid input:\n${listed.map(({ path, message }) => `  ${path === '' ? '(input)' : path}: ${message}`).join('\n')}`,
			{ code: errorCodes.invalidInput, details: { issues: listed }, cause: error.cause }
		)
	}
	if (error.cause instanceof LinguifyError) return error.cause
	if (getHTTPStatusCodeFromError(error) < serverErrorStatus) {
		return new ValidationError(error.message, { code: errorCodes.invalidInput, cause: error })
	}
	return toLinguifyError(error.cause ?? error)
}

/**
 * the first HTTP status that blames the server rather than the request
 */
const serverErrorStatus = 500

/**
 * @param error - a linguify error
 *
 * @returns it as a tRPC error with the matching code and HTTP status, keeping it as the cause
 */
export const toTransportError = (error: LinguifyError): TRPCError =>
	new TRPCError({ code: transportCodes[error.code], message: error.message, cause: error })

/**
 * @param cause - a validation error's cause
 *
 * @returns its issues, when it is a schema's report — zod and every Standard Schema validator carry them
 */
const inputIssues = (cause: unknown): InputIssue[] | undefined => {
	const issues = (cause as { issues?: unknown } | undefined)?.issues
	return Array.isArray(issues) ? (issues as InputIssue[]) : undefined
}
