import type { AppRouter } from '@linguify/api'
import { studioRoutes } from '@linguify/constants'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { inferRouterOutputs } from '@trpc/server'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { reportWriteError } from './write-errors'

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
 */
export const queryClient: QueryClient = new QueryClient({
	defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
	mutationCache: new MutationCache({ onError: error => reportWriteError(error, refresh) })
})

/**
 * reads everything on screen from the files again
 *
 * @returns settled once every shown query is read again
 */
export const refresh = () => queryClient.refetchQueries({ type: 'active' })

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

/**
 * what each API call answers, as the client receives it
 */
export type ApiOutputs = inferRouterOutputs<AppRouter>
