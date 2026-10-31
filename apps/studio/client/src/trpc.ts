import type { AppRouter } from '@linguify/api'
import { studioRoutes } from '@linguify/constants'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { dismissWriteErrors, reportWriteError } from './write-errors'

/**
 * the studio's API, typed by its router — calls go to the studio that served the page
 */
export const trpcClient = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: studioRoutes.trpc })] })

/**
 * the query cache every view reads through
 *
 * @note no refetch on window focus: the files are the studio's while it runs, and a refetch would hide
 * that a hand edit needs a refresh
 *
 * @note every write's failure is reported from here, once for all of them — a query's error handling never
 * sees a mutation's, and a write that fails unseen is a lost change
 *
 * @note reads and writes go out whatever the browser thinks of the network: the studio is on this machine,
 * and a write held back while the Wi-Fi is down would wait unseen, what was typed with it
 */
export const queryClient: QueryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: false, networkMode: 'always' },
		mutations: { networkMode: 'always' }
	},
	mutationCache: new MutationCache({ onError: error => reportWriteError(error, refresh) })
})

/**
 * what to do whenever the files are read again at the person's asking
 */
const refreshListeners = new Set<() => void>()

/**
 * @param listener - called on every refresh, before the files are read again
 *
 * @returns what stops it being called
 */
export const onRefresh = (listener: () => void) => {
	refreshListeners.add(listener)
	return () => {
		refreshListeners.delete(listener)
	}
}

/**
 * reads everything on screen from the files again — what failed writes said goes with it, as it no longer
 * holds
 *
 * @returns settled once every shown query is read again; rejected when one could not be
 */
export const refresh = () => {
	dismissWriteErrors()
	for (const listener of refreshListeners) listener()
	return queryClient.refetchQueries({ type: 'active' }, { throwOnError: true })
}

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

/**
 * what each API call answers, as the client receives it
 */
export type ApiOutputs = inferRouterOutputs<AppRouter>

/**
 * what each API call takes, as the client sends it
 */
export type ApiInputs = inferRouterInputs<AppRouter>
