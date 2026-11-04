import { z } from 'zod'

/**
 * `sync`
 */
export const syncInput = z.strictObject({
	removeUnused: z
		.boolean()
		.optional()
		.describe(
			'Also remove the keys the default locale no longer has, and their descriptions; overrides `sync.removeUnused`'
		)
})
