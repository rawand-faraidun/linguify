import type { QueryClient } from '@tanstack/react-query'

/**
 * a failed write, as a surface is told of it — or nothing, once what it said no longer holds
 */
export type WriteFailureNotice = { error: unknown } | undefined

/**
 * what a surface keeps of its writes' failures and its refreshes — the studio and the extension each make
 * one, over their own query cache, and draw what it tells them their own way
 *
 * @note a failed write is told to whoever listens; what it said is taken down by `dismiss` — once a later
 * write goes through — and by `refresh`, which also tells every refresh listener (rows held behind an
 * earlier edit are let go) before reading every shown query again
 *
 * @param queryClient - the surface's query cache
 *
 * @returns `failed`, `dismiss`, `onFailure`, `onRefresh` and `refresh`
 */
export const writeSession = (queryClient: QueryClient) => {
	const failureListeners = new Set<(notice: WriteFailureNotice) => void>()
	const refreshListeners = new Set<() => void>()
	const tell = (notice: WriteFailureNotice) => {
		for (const listener of failureListeners) listener(notice)
	}
	const dismiss = () => tell(undefined)
	return {
		/**
		 * @param error - what a write threw
		 */
		failed: (error: unknown) => tell({ error }),
		dismiss,
		/**
		 * @param listener - told of every failed write, and with nothing once what it said no longer holds
		 *
		 * @returns what stops it being told
		 */
		onFailure: (listener: (notice: WriteFailureNotice) => void) => {
			failureListeners.add(listener)
			return () => {
				failureListeners.delete(listener)
			}
		},
		/**
		 * @param listener - called on every refresh, before the files are read again
		 *
		 * @returns what stops it being called
		 */
		onRefresh: (listener: () => void) => {
			refreshListeners.add(listener)
			return () => {
				refreshListeners.delete(listener)
			}
		},
		/**
		 * reads everything on screen from the files again — what failed writes said goes with it
		 *
		 * @returns settled once every shown query is read again; rejected when one could not be
		 */
		refresh: () => {
			dismiss()
			for (const listener of refreshListeners) listener()
			return queryClient.refetchQueries({ type: 'active' }, { throwOnError: true })
		}
	}
}
