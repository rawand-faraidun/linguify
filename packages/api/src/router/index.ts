import { router } from '../trpc'
import { catalogueRouter } from './catalogue'
import { configRouter } from './config'

/**
 * every procedure, by resource
 */
export const appRouter = router({
	config: configRouter,
	catalogue: catalogueRouter
})

/**
 * the router's type — the one thing browser code imports from this package, as a type
 */
export type AppRouter = typeof appRouter
