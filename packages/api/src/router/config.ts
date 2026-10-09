import { projectProcedure, router } from '../trpc'

/**
 * the project's config
 */
export const configRouter = router({
	/**
	 * the resolved config, the file it came from, which layer set each value, and what the config's
	 * engine can express — everything a surface needs to lay itself out
	 */
	get: projectProcedure.query(({ ctx }) => ({
		...ctx.loaded,
		capabilities: ctx.operation.capabilities,
		namespaced: ctx.operation.namespaced
	}))
})
