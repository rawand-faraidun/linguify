import { listKeys, listLocales, listNamespaces, readCatalogue } from '@linguify/core'
import { listKeysInput } from '../contracts'
import { projectProcedure, router } from '../trpc'

/**
 * `list locales`, `list namespaces`, `list keys`
 */
export const listRouter = router({
	/**
	 * every configured locale, in config order, and which is the default
	 */
	locales: projectProcedure.query(({ ctx }) => listLocales(ctx.operation)),

	/**
	 * every namespace any locale has — `NAMESPACES_DISABLED` when the project has none
	 */
	namespaces: projectProcedure.query(async ({ ctx }) =>
		listNamespaces(ctx.operation, (await readCatalogue(ctx.loaded)).catalogue)
	),

	/**
	 * one row per key, with its text in each locale — or in one, keeping every key
	 */
	keys: projectProcedure
		.input(listKeysInput.optional())
		.query(async ({ ctx, input }) => listKeys(ctx.operation, (await readCatalogue(ctx.loaded)).catalogue, input))
})
