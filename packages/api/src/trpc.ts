import { createOperationContext, loadConfig } from '@linguify/core'
import { initTRPC } from '@trpc/server'
import type { Context } from './context'
import { toApiError, toTransportError } from './errors'

const t = initTRPC.context<Context>().create({
	/**
	 * copies the linguify error's code, message and details into every error response, so surfaces branch
	 * on `data.linguify.code`, never on text
	 */
	errorFormatter: ({ shape, error }) => ({ ...shape, data: { ...shape.data, linguify: toApiError(error).toJSON() } })
})

/**
 * groups procedures into a router
 */
export const router = t.router

/**
 * builds `createCaller` for a router — calls without a server
 */
export const createCallerFactory = t.createCallerFactory

/**
 * every procedure: a linguify error leaves with its own tRPC code and HTTP status, not as a 500
 */
export const procedure = t.procedure.use(async ({ next }) => {
	const result = await next()
	if (result.ok || result.error.code !== 'INTERNAL_SERVER_ERROR') return result
	return { ...result, error: toTransportError(toApiError(result.error)) }
})

/**
 * a procedure on a project: its config is loaded first, on every call
 */
export const projectProcedure = procedure.use(async ({ ctx, next }) => {
	const loaded = await loadConfig(ctx)
	return next({ ctx: { loaded, operation: createOperationContext(loaded.config) } })
})
