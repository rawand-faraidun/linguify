import type { AppRouter } from '@linguify/api'
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
 * who hears of a write that failed — the panel's notice; one at a time
 */
const failureListeners = new Set<(error: unknown) => void>()

/**
 * @param listener - told of every write that fails
 *
 * @returns what stops it being told
 */
export const onWriteFailure = (listener: (error: unknown) => void) => {
	failureListeners.add(listener)
	return () => {
		failureListeners.delete(listener)
	}
}

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
	mutationCache: new MutationCache({
		onError: error => {
			for (const listener of failureListeners) listener(error)
		}
	})
})

/**
 * reads everything on screen from the files again
 *
 * @returns settled once every shown query is read again; rejected when one could not be
 */
export const refresh = () => queryClient.refetchQueries({ type: 'active' }, { throwOnError: true })

/**
 * `TRPCProvider` and `useTRPC` — the API as TanStack Query options
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

/**
 * what each API call answers, as the webview receives it
 */
export type ApiOutputs = inferRouterOutputs<AppRouter>
