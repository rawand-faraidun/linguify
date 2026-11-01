import { useEffect, useState } from 'react'
import { studioText, writeFailures } from '@linguify/constants'
import { errorMessage, writeFailure } from '@linguify/table'
import { onWriteFailure, refresh } from './trpc'

/**
 * what the panel says when a write failed — the files changed on disk, or no answer came, each with a
 * Refresh; any other refusal with linguify's reason — in the panel itself: a toast library would bring its
 * own styles, which the panel's policy refuses
 *
 * @note it goes once a refresh reads the files again, or when the person closes it
 *
 * @returns the notice, or nothing
 */
export const WriteNotice = () => {
	const [failure, setFailure] = useState<{ error: unknown }>()
	useEffect(() => onWriteFailure(error => setFailure({ error })), [])
	if (failure === undefined) return null
	return (
		<FailureNotice
			error={failure.error}
			onRefreshed={() => setFailure(undefined)}
			onClose={() => setFailure(undefined)}
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
	const kind = writeFailure(error)
	const said = {
		[writeFailures.stale]: `${studioText.staleTitle}. ${studioText.staleDescription}`,
		[writeFailures.unsure]: `${studioText.writeUnsure}. ${studioText.writeUnsureDescription}`,
		[writeFailures.failed]: `${studioText.writeFailed}: ${errorMessage(error)}`
	}
	return (
		<div role="alert" className="flex shrink-0 items-center gap-2 border border-missing-border bg-missing px-2 py-1.5">
			<p className="wrap-anywhere flex-1">{refreshFailed ? studioText.refreshFailed : said[kind]}</p>
			{kind !== writeFailures.failed && (
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
