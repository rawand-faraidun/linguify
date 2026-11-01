import type { AppRouter } from '@linguify/api'
import { bridgeChangedType } from '@linguify/constants'
import { writeSession } from '@linguify/table/react'
import type { BridgeChanged } from '@linguify/types'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { createTRPCClient } from '@trpc/client'
import type { inferRouterOutputs } from '@trpc/server'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { bridgeLink } from './bridge-link'

/**
 * the API, called through the host over the bridge
 */
export const trpcClient = createTRPCClient<AppRouter>({ links: [bridgeLink()] })

/**
 * the query cache every view reads through
 *
 * @note calls go out whatever the browser thinks of the network: they never touch it. Every write's failure
 * is reported from here, once for all of them — a write that fails unseen is a lost change
 */
export const queryClient: QueryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: false, networkMode: 'always' },
		mutations: { networkMode: 'always' }
	},
	mutationCache: new MutationCache({ onError: error => session.failed(error) })
})

/**
 * the panel's writes' failures and refreshes — said in the panel's notice, taken down once they no longer
 * hold
 */
export const session = writeSession(queryClient)

/**
 * @param listener - called on every refresh, before the files are read again
 *
 * @returns what stops it being called
 */
export const onRefresh = session.onRefresh

/**
 * reads everything on screen from the files again — what failed writes said goes with it
 *
 * @returns settled once every shown query is read again; rejected when one could not be
 */
export const refresh = session.refresh

// a palette command wrote the files: what is shown is read again, so the next write expects what is there
window.addEventListener('message', ({ data }: MessageEvent<unknown>) => {
	if (typeof data === 'object' && data !== null && (data as Partial<BridgeChanged>).type === bridgeChangedType)
		void queryClient.invalidateQueries()
})

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

/**
 * what each API call answers, as the webview receives it
 */
export type ApiOutputs = inferRouterOutputs<AppRouter>
