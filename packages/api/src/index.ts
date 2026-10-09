import { appRouter } from './router'
import { createCallerFactory } from './trpc'

export type { Context } from './context'
export { toApiError } from './errors'
export { type AppRouter, appRouter } from './router'

/**
 * calls procedures in-process, with no server — the CLI and the extension host
 *
 * @example
 * const caller = createCaller({ cwd: process.cwd() })
 * const { catalogue, revision } = await caller.catalogue.get()
 */
export const createCaller = createCallerFactory(appRouter)
