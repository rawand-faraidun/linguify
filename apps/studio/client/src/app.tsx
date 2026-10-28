import { studioText } from '@linguify/constants'
import { TooltipProvider } from '@linguify/ui/components/tooltip'
import { useQuery } from '@tanstack/react-query'
import { Freshness } from './freshness'
import { Toolbar } from './toolbar'
import { useTRPC } from './trpc'

/**
 * the studio: the toolbar, the project, and the footer saying how fresh it is
 *
 * @note only the middle scrolls, so the toolbar and footer stay in view over thousands of keys; and what was
 * read stays on screen when a refresh fails, with the error above it
 *
 * @returns the page
 */
export const App = () => {
	const trpc = useTRPC()
	const config = useQuery(trpc.config.get.queryOptions())
	return (
		<TooltipProvider>
			<div className="flex h-svh flex-col">
				<Toolbar />
				<main className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4">
					{config.isPending && <p className="text-muted-foreground">{studioText.loading}</p>}
					{config.isError && (
						<p id="error" role="alert" className="text-destructive">
							{config.error.message}
						</p>
					)}
					{config.data !== undefined && (
						<>
							<p id="config-file" className="break-all text-muted-foreground">
								{config.data.file}
							</p>
							<p id="locales">{config.data.config.locales.join(', ')}</p>
						</>
					)}
				</main>
				<Freshness readAt={config.dataUpdatedAt} />
			</div>
		</TooltipProvider>
	)
}
