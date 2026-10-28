import type { AppRouter } from '@linguify/api'
import { studioRoutes } from '@linguify/constants'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'

/**
 * the studio's API, typed by its router — calls go to the studio that served the page
 */
export const trpcClient = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: studioRoutes.trpc })] })

/**
 * the query cache every view reads through
 *
 * @note no refetch on window focus: the files are the studio's while it runs, and a refetch would hide
 * that a hand edit needs a refresh
 */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } }
})

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
