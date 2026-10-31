import type { AppRouter } from '@linguify/api'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { bridgeLink } from './bridge-link'

/**
 * the API, called through the host over the bridge
 */
export const trpcClient = createTRPCClient<AppRouter>({ links: [bridgeLink()] })

/**
 * the query cache every view reads through
 *
 * @note calls go out whatever the browser thinks of the network: they never touch it
 */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false, networkMode: 'always' } }
})

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
