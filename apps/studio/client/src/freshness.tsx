import { studioText } from '@linguify/constants'
import { Button } from '@linguify/ui/components/button'
import { cn } from '@linguify/ui/lib/utils'
import { useIsFetching } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'
import { focusRingClass } from './classes'
import { refresh } from './trpc'

/**
 * the quiet footer: when the files were read, what to do after editing them by hand, and a refresh
 *
 * @note the studio watches nothing, so what it shows is as old as this time says. The config is read on
 * every request, so a hand edit to it or to a translation file needs only a refresh; the port, bound at
 * start, needs a restart
 *
 * @note Refresh stays focusable while it works — a disabled button would drop keyboard focus to the page —
 * and the new time is announced
 *
 * @param props - `readAt`, when the shown data was read in milliseconds since the epoch; `0` until it has been
 *
 * @returns the footer
 */
export const Freshness = ({ readAt }: { readAt: number }) => {
	const fetching = useIsFetching() > 0
	const read = new Date(readAt)
	return (
		<footer className="flex shrink-0 items-center gap-2 border-t px-4 py-1.5 text-muted-foreground text-xs">
			<p id="freshness">
				<span aria-live="polite">
					{readAt > 0 && (
						<>
							{studioText.readAt} <time dateTime={read.toISOString()}>{read.toLocaleTimeString()}</time>.{' '}
						</>
					)}
				</span>
				{studioText.freshness}
			</p>
			<Button
				variant="ghost"
				size="sm"
				className={cn('ms-auto', focusRingClass)}
				aria-disabled={fetching}
				onClick={() => {
					if (!fetching) void refresh().catch(() => undefined)
				}}
			>
				<RefreshCwIcon data-icon="inline-start" className={cn(fetching && 'motion-safe:animate-spin')} />
				{studioText.refresh}
			</Button>
		</footer>
	)
}
