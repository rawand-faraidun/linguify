import { extensionText, studioText } from '@linguify/constants'
import { useIsFetching } from '@tanstack/react-query'
import { refresh } from './trpc'

/**
 * the panel's quiet footer, as the studio's: when the files were read, that nothing watches them, and a
 * refresh
 *
 * @note the panel watches nothing, so what it shows is as old as this time says; a palette command that
 * writes has it read the files again by itself. Refresh stays focusable while it works — a disabled button
 * would drop the keyboard to the page — and the new time is announced
 *
 * @param props - `readAt`, when what is shown was read, in milliseconds since the epoch
 *
 * @returns the footer
 */
export const Freshness = ({ readAt }: { readAt: number }) => {
	const fetching = useIsFetching() > 0
	const read = new Date(readAt)
	return (
		<footer className="flex shrink-0 items-center gap-2 border-border border-t px-2 py-1 text-muted-foreground">
			<p id="freshness" className="min-w-0 flex-1">
				<span aria-live="polite">
					{studioText.readAt} <time dateTime={read.toISOString()}>{read.toLocaleTimeString()}</time>.{' '}
				</span>
				{extensionText.freshness}
			</p>
			<button
				type="button"
				aria-disabled={fetching}
				className="border border-control-border bg-control px-2 py-0.5 text-control-foreground aria-disabled:opacity-50"
				onClick={() => {
					if (!fetching) void refresh().catch(() => undefined)
				}}
			>
				{studioText.refresh}
			</button>
		</footer>
	)
}
