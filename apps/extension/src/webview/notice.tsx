import { useEffect, useState } from 'react'
import { studioText, writeFailures } from '@linguify/constants'
import { errorMessage, writeFailure } from '@linguify/table'
import { onWriteFailure, refresh } from './trpc'

/**
 * what the panel says when a write failed — the files changed on disk, or no answer came, each with a
 * Refresh; any other refusal with linguify's reason — in the panel itself: a toast library would bring its
 * own styles, which the panel's policy refuses
 *
 * @note it goes once a refresh reads the files again, or when the person closes it. A refresh that cannot
 * read them keeps it, and says so
 *
 * @returns the notice, or nothing
 */
export const WriteNotice = () => {
	const [failure, setFailure] = useState<{ error: unknown }>()
	const [refreshFailed, setRefreshFailed] = useState(false)
	useEffect(
		() =>
			onWriteFailure(error => {
				setRefreshFailed(false)
				setFailure({ error })
			}),
		[]
	)
	if (failure === undefined) return null
	const kind = writeFailure(failure.error)
	const said = {
		[writeFailures.stale]: `${studioText.staleTitle}. ${studioText.staleDescription}`,
		[writeFailures.unsure]: `${studioText.writeUnsure}. ${studioText.writeUnsureDescription}`,
		[writeFailures.failed]: `${studioText.writeFailed}: ${errorMessage(failure.error)}`
	}
	return (
		<div role="alert" className="flex shrink-0 items-center gap-2 border border-missing-border bg-missing px-2 py-1.5">
			<p className="wrap-anywhere flex-1">{refreshFailed ? studioText.refreshFailed : said[kind]}</p>
			{kind !== writeFailures.failed && (
				<button
					type="button"
					className="border border-control-border bg-control px-2 py-0.5 text-control-foreground"
					onClick={() =>
						void refresh().then(
							() => setFailure(undefined),
							() => setRefreshFailed(true)
						)
					}
				>
					{studioText.refresh}
				</button>
			)}
			<button type="button" aria-label={studioText.close} className="px-1" onClick={() => setFailure(undefined)}>
				×
			</button>
		</div>
	)
}
