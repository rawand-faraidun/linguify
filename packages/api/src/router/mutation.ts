import type { OperationContext, OperationResult } from '@linguify/core'
import type { Catalogue } from '@linguify/types'
import type { z } from 'zod'
import { mutationOptions } from '../contracts'
import { type MutationOptions, run } from '../run'
import { projectProcedure } from '../trpc'

/**
 * a procedure for an operation that changes translations: its contract plus `dryRun` and
 * `expectedRevision`, carried out by {@link run}
 *
 * @note generic over the contract's shape, not the contract: over `z.ZodObject` itself the extended
 * input would erase to `Record<string, unknown>`, and every caller would lose its types
 *
 * @param contract - the operation's input contract
 * @param operation - the operation
 *
 * @returns the mutation procedure; it returns the report, the plan, the revision and whether it was applied
 */
export const mutation = <Shape extends z.ZodRawShape>(
	contract: z.ZodObject<Shape, z.core.$strict>,
	operation: (context: OperationContext, catalogue: Catalogue, input: z.output<typeof contract>) => OperationResult
) =>
	projectProcedure.input(contract.extend(mutationOptions.shape)).mutation(({ ctx, input }) => {
		// callers see the exact input type, resolved per contract; inside this generic body TypeScript cannot
		// compute the extended shape, so it is viewed as what that extension parsed
		const { dryRun, expectedRevision, ...own } = input as z.output<typeof contract> & MutationOptions
		return run(ctx, operation, own as z.output<typeof contract>, { dryRun, expectedRevision })
	})
