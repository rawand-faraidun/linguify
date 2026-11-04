import { errorCodes, studioText, writeFailures } from '@linguify/constants'

/**
 * @param error - what a call threw
 *
 * @returns the linguify error the API put in it — its code and message — or nothing when no answer came
 *
 * @note read by its shape: a tRPC client error carries it in `data.linguify`, whichever client made the call
 */
const linguifyError = (error: unknown): { code: string; message: string } | undefined => {
	if (typeof error !== 'object' || error === null || !('data' in error)) return undefined
	const { data } = error as { data?: { linguify?: { code?: unknown; message?: unknown } } }
	const linguify = data?.linguify
	return typeof linguify?.code === 'string' && typeof linguify.message === 'string'
		? { code: linguify.code, message: linguify.message }
		: undefined
}

/**
 * how a write failed: refused because the files changed on disk, refused for another reason, or with no
 * answer — the studio and the extension say each in their own way
 *
 * @param error - what a write threw
 *
 * @returns the kind of failure
 */
export const writeFailure = (error: unknown) => {
	const linguify = linguifyError(error)
	if (linguify === undefined) return writeFailures.unsure
	return linguify.code === errorCodes.staleCatalogue ? writeFailures.stale : writeFailures.failed
}

/**
 * @param error - what a call threw
 *
 * @returns what to tell a person: linguify's own message — or, when no answer came, that it may not have
 * finished
 */
export const errorMessage = (error: unknown): string => linguifyError(error)?.message ?? studioText.writeUnsure

/**
 * @param error - what a write threw
 *
 * @returns what to say of it — the files changed on disk, no answer came, or linguify's reason for refusing
 * — and whether reading the files again is the way on
 */
export const failureText = (error: unknown): { said: string; refreshable: boolean } => {
	const kind = writeFailure(error)
	const said = {
		[writeFailures.stale]: `${studioText.staleTitle}. ${studioText.staleDescription}`,
		[writeFailures.unsure]: `${studioText.writeUnsure}. ${studioText.writeUnsureDescription}`,
		[writeFailures.failed]: `${studioText.writeFailed}: ${errorMessage(error)}`
	}
	return { said: said[kind], refreshable: kind !== writeFailures.failed }
}
