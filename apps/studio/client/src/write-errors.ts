import type { AppRouter } from '@linguify/api'
import { errorCodes, studioText, writeFailures } from '@linguify/constants'
import { isTRPCClientError } from '@trpc/client'
import { toast } from 'sonner'

/**
 * tells a person that a write failed: for the files having changed on disk since they were read, that
 * nothing was written, with a way to read them again; for any other refusal, that nothing was written and
 * why; and when no answer came — the connection lost — that it may not have finished
 *
 * @note these stay until the person dismisses them, or until a refresh or a later write makes them untrue —
 * {@link dismissWriteErrors}. One of each kind at most: a retry that fails again replaces it
 *
 * @param error - what the write threw
 * @param refresh - reads every shown query again
 */
export const reportWriteError = (error: Error, refresh: () => void) => {
	const linguify = linguifyError(error)
	const lasting = { duration: Number.POSITIVE_INFINITY, closeButton: true }
	if (linguify?.code === errorCodes.staleCatalogue) {
		toast.warning(studioText.staleTitle, {
			...lasting,
			id: writeFailures.stale,
			description: studioText.staleDescription,
			action: { label: studioText.refresh, onClick: refresh }
		})
		return
	}
	if (linguify !== undefined) {
		toast.error(studioText.writeFailed, { ...lasting, id: writeFailures.failed, description: linguify.message })
		return
	}
	toast.error(studioText.writeUnsure, {
		...lasting,
		id: writeFailures.unsure,
		description: studioText.writeUnsureDescription,
		action: { label: studioText.refresh, onClick: refresh }
	})
}

/**
 * takes down what failed writes said — once the files are read again, or a write has gone through; each
 * kind's toast has the kind as its id
 */
export const dismissWriteErrors = () => {
	for (const id of Object.values(writeFailures)) toast.dismiss(id)
}

/**
 * @param error - what a call threw
 *
 * @returns the linguify error the API put in it — nothing when no answer came
 */
const linguifyError = (error: unknown) =>
	error instanceof Error && isTRPCClientError<AppRouter>(error) ? error.data?.linguify : undefined

/**
 * @param error - what a write threw
 *
 * @returns how it failed: refused as stale, refused for another reason, or with no answer
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
