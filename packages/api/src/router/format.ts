import { format } from '@linguify/core'
import { mutationOptions } from '../contracts'
import { run } from '../run'
import { projectProcedure } from '../trpc'

/**
 * `format` — sorts and lays out every file; `format --check` is its dry run, and an empty plan means
 * everything is formatted
 *
 * @note its changes are files, not keys, so the plan is made even with no key changes — but never
 * creates a missing locale's file, and ignores a difference only in line endings
 */
export const formatProcedure = projectProcedure
	.input(mutationOptions.optional())
	.mutation(({ ctx, input = {} }) =>
		run(ctx, format, undefined, input, { always: true, create: false, anyLineEnding: true })
	)
