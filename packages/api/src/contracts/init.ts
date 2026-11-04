import { z } from 'zod'
import { locale } from './shared'

/**
 * `init`
 */
export const initInput = z.strictObject({
	path: z
		.string()
		.min(1)
		.optional()
		.describe('Where the translation files live, relative to the config — `./locales` by default'),
	locales: z.array(locale).min(1).optional().describe('The locales the project has — `en` by default'),
	default: locale.optional().describe('The locale every other is compared against — the first of `locales` by default'),
	options: z
		.record(z.string(), z.unknown())
		.optional()
		.describe("The engine's options — for JSON, `fileStructure` and `namespaces`")
})
