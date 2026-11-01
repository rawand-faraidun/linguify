import { useEffect, useRef, useState } from 'react'
import { studioText, tableId } from '@linguify/constants'
import { failureText } from '@linguify/table'
import { focusTableStop, type WriteFailureNotice } from '@linguify/table/react'
import { refresh, session } from './trpc'

/**
 * what the panel says when a write failed — the files changed on disk, or no answer came, each with a
 * Refresh; any other refusal with linguify's reason — in the panel itself: a toast library would bring its
 * own styles, which the panel's policy refuses
 *
 * @note it goes once a refresh reads the files again, a later write goes through, or the person closes it;
 * after its Refresh the keyboard goes back where it was when the write failed — else to the grid
 *
 * @returns the notice, or nothing
 */
export const WriteNotice = () => {
	// each failure drawn afresh, so a repeat is said again and a refresh that failed before is not carried over
	const [failure, setFailure] = useState<{ notice: WriteFailureNotice; count: number }>({ notice: undefined, count: 0 })
	// where the keyboard was when the write failed — an editor left open, a field — to go back to after Refresh
	const before = useRef<Element | null>(null)
	useEffect(
		() =>
			session.onFailure(notice => {
				if (notice !== undefined) before.current = document.activeElement
				setFailure(current => ({ notice, count: current.count + 1 }))
			}),
		[]
	)
	if (failure.notice === undefined) return null
	const close = () => setFailure(current => ({ ...current, notice: undefined }))
	return (
		<FailureNotice
			key={failure.count}
			error={failure.notice.error}
			onRefreshed={() => {
				close()
				const back = before.current
				if (back instanceof HTMLElement && back.isConnected) back.focus()
				else focusTableStop(document.getElementById(tableId))
			}}
			onClose={close}
		/>
	)
}

/**
 * one failed write, said: what the panel's notice shows, and what a dialog shows inside it — a modal keeps
 * the panel's own notice out of reach
 *
 * @note a refresh that cannot read the files keeps it, and says so
 *
 * @param props - `error`, what the write threw; `onRefreshed`, once the files are read again; `onClose`,
 * when it can be closed
 *
 * @returns the notice
 */
export const FailureNotice = ({
	error,
	onRefreshed,
	onClose
}: {
	error: unknown
	onRefreshed: () => void
	onClose?: () => void
}) => {
	const [refreshFailed, setRefreshFailed] = useState(false)
	const { said, refreshable } = failureText(error)
	return (
		<div role="alert" className="flex shrink-0 items-center gap-2 border border-missing-border bg-missing px-2 py-1.5">
			<p className="wrap-anywhere flex-1">{refreshFailed ? studioText.refreshFailed : said}</p>
			{refreshable && (
				<button
					type="button"
					className="border border-control-border bg-control px-2 py-0.5 text-control-foreground"
					onClick={() => void refresh().then(onRefreshed, () => setRefreshFailed(true))}
				>
					{studioText.refresh}
				</button>
			)}
			{onClose !== undefined && (
				<button type="button" aria-label={studioText.close} className="px-1" onClick={onClose}>
					×
				</button>
			)}
		</div>
	)
}
