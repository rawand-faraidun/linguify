import type { AppRouter } from '@linguify/api'
import { errorCodes, studioText } from '@linguify/constants'
import { isTRPCClientError } from '@trpc/client'
import { toast } from 'sonner'

/**
 * tells a person that a write failed: for the files having changed on disk since they were read, that
 * nothing was written, with a way to read them again; for any other refusal, that nothing was written and
 * why; and when no answer came — the connection lost — that it may not have finished
 *
 * @note these stay until dismissed: what they say holds until the person acts, and the keyboard needs the
 * time to reach them
 *
 * @param error - what the write threw
 * @param refresh - reads every shown query again
 */
export const reportWriteError = (error: Error, refresh: () => void) => {
	const linguify = isTRPCClientError<AppRouter>(error) ? error.data?.linguify : undefined
	const lasting = { duration: Number.POSITIVE_INFINITY, closeButton: true }
	if (linguify?.code === errorCodes.staleCatalogue) {
		toast.warning(studioText.staleTitle, {
			...lasting,
			id: errorCodes.staleCatalogue,
			description: studioText.staleDescription,
			action: { label: studioText.refresh, onClick: refresh }
		})
		return
	}
	if (linguify !== undefined) {
		toast.error(studioText.writeFailed, { ...lasting, description: linguify.message })
		return
	}
	toast.error(studioText.writeUnsure, {
		...lasting,
		description: studioText.writeUnsureDescription,
		action: { label: studioText.refresh, onClick: refresh }
	})
}

/**
 * @param error - what a write threw
 *
 * @returns whether it was refused because the files changed on disk since they were read
 */
export const isStaleWrite = (error: unknown): boolean =>
	error instanceof Error &&
	isTRPCClientError<AppRouter>(error) &&
	error.data?.linguify.code === errorCodes.staleCatalogue
