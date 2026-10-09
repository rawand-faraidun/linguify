import { z } from 'zod'
import { locale } from './shared'

/**
 * `diff`
 */
export const diffInput = z.strictObject({
	locale: locale.optional().describe('Compare only this locale with the default')
})
