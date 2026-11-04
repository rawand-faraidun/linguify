import { diff, readCatalogue } from '@linguify/core'
import { diffInput } from '../contracts'
import { projectProcedure } from '../trpc'

/**
 * `diff` — each other locale against the default: missing, extra and empty keys
 */
export const diffProcedure = projectProcedure
	.input(diffInput.optional())
	.query(async ({ ctx, input }) => diff(ctx.operation, (await readCatalogue(ctx.loaded)).catalogue, input))
