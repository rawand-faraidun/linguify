import { studioText, writeFailures } from '@linguify/constants'
import { errorMessage, writeFailure } from '@linguify/table'
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
export const reportWriteError = (error: unknown, refresh: () => void) => {
	const kind = writeFailure(error)
	const lasting = { duration: Number.POSITIVE_INFINITY, closeButton: true }
	if (kind === writeFailures.stale) {
		toast.warning(studioText.staleTitle, {
			...lasting,
			id: writeFailures.stale,
			description: studioText.staleDescription,
			action: { label: studioText.refresh, onClick: refresh }
		})
		return
	}
	if (kind === writeFailures.failed) {
		toast.error(studioText.writeFailed, { ...lasting, id: writeFailures.failed, description: errorMessage(error) })
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
