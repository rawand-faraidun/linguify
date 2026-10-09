import { router } from '../trpc'
import { catalogueRouter } from './catalogue'
import { configRouter } from './config'
import { diffProcedure } from './diff'
import { formatProcedure } from './format'
import { exportProcedure, importProcedure } from './io'
import { keyRouter } from './key'
import { listRouter } from './list'
import { namespaceRouter } from './namespace'
import { syncProcedure } from './sync'

/**
 * every procedure, by resource — each path is the CLI command it serves: `list.keys` is `linguify list keys`
 */
export const appRouter = router({
	config: configRouter,
	catalogue: catalogueRouter,
	list: listRouter,
	diff: diffProcedure,
	key: keyRouter,
	namespace: namespaceRouter,
	sync: syncProcedure,
	format: formatProcedure,
	export: exportProcedure,
	import: importProcedure
})

/**
 * the router's type — the one thing browser code imports from this package, as a type
 */
export type AppRouter = typeof appRouter
