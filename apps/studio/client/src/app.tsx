import { studioText } from '@linguify/constants'
import { TooltipProvider } from '@linguify/ui/components/tooltip'
import { useQuery } from '@tanstack/react-query'
import { Freshness } from './freshness'
import { Toolbar } from './toolbar'
import { useTRPC } from './trpc'
import { Workspace } from './workspace'

/**
 * the studio: the toolbar, the project, and the footer saying how fresh it is
 *
 * @note only the middle scrolls, so the toolbar and footer stay in view over thousands of keys; and what was
 * read stays on screen when a refresh fails, with the error above it. The footer's time is the older of the
 * two reads — what is shown is no fresher than that
 *
 * @returns the page
 */
export const App = () => {
	const trpc = useTRPC()
	const config = useQuery(trpc.config.get.queryOptions())
	const catalogue = useQuery(trpc.catalogue.get.queryOptions())
	const error = config.error?.message ?? catalogue.error?.message
	const read = config.data !== undefined && catalogue.data !== undefined
	return (
		<TooltipProvider>
			<div className="flex h-svh flex-col">
				{read ? (
					<Workspace config={config.data} catalogue={catalogue.data} error={error} />
				) : (
					<>
						<Toolbar />
						<main className="min-h-0 flex-1 overflow-auto p-4">
							{error === undefined ? (
								<p className="text-muted-foreground">{studioText.loading}</p>
							) : (
								<p id="error" role="alert" className="text-destructive">
									{error}
								</p>
							)}
						</main>
					</>
				)}
				<Freshness readAt={read ? Math.min(config.dataUpdatedAt, catalogue.dataUpdatedAt) : 0} />
			</div>
		</TooltipProvider>
	)
}
