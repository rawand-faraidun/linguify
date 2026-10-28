import { useQuery } from '@tanstack/react-query'
import { useTRPC } from './trpc'

/**
 * the studio
 *
 * @returns the page
 */
export const App = () => {
	const trpc = useTRPC()
	const config = useQuery(trpc.config.get.queryOptions())
	if (config.isPending) return <p className="p-4 text-muted-foreground">Loading…</p>
	if (config.isError) return <p className="p-4 text-destructive">{config.error.message}</p>
	return (
		<main className="flex flex-col gap-2 p-4">
			<h1 className="font-semibold">Linguify studio</h1>
			<p id="config-file" className="text-muted-foreground">
				{config.data.file}
			</p>
			<p id="locales">{config.data.config.locales.join(', ')}</p>
		</main>
	)
}
