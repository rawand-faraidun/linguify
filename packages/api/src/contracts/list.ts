import { z } from 'zod'
import { locale } from './shared'

/**
 * `list keys`
 */
export const listKeysInput = z.strictObject({
	locale: locale.optional().describe("Show only this locale's text; every key is still listed")
})
