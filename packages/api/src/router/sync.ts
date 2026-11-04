import { sync } from '@linguify/core'
import { mutationOptions, syncInput } from '../contracts'
import { run } from '../run'
import { projectProcedure } from '../trpc'

/**
 * `sync` — every other locale brought in line with the default; the input may be left out
 */
export const syncProcedure = projectProcedure
	.input(syncInput.extend(mutationOptions.shape).optional())
	.mutation(({ ctx, input: { dryRun, expectedRevision, ...input } = {} }) =>
		run(ctx, sync, input, { dryRun, expectedRevision })
	)
