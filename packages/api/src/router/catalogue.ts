import { readCatalogue } from '@linguify/core'
import { projectProcedure, router } from '../trpc'

/**
 * the translations as a whole
 */
export const catalogueRouter = router({
	/**
	 * every locale's tree and the descriptions, read now, with the revision a later write must carry
	 */
	get: projectProcedure.query(async ({ ctx }) => {
		const { catalogue, revision } = await readCatalogue(ctx.loaded)
		return { catalogue, revision }
	})
})
