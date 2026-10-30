import { ioFormats } from '@linguify/constants'
import { z } from 'zod'

/**
 * `export`
 */
export const exportInput = z.strictObject({
	format: z
		.enum(ioFormats)
		.optional()
		.describe("csv, tsv, json or xlsx; else the path's extension decides, else `io.format`"),
	path: z
		.string()
		.trim()
		.min(1)
		.optional()
		.describe('Where to write, from the working directory; `translations.<format>` by default')
})

/**
 * `import`
 */
export const importInput = z.strictObject({
	format: z
		.enum(ioFormats)
		.optional()
		.describe("csv, tsv, json or xlsx; else the path's extension decides, else `io.format`"),
	path: z
		.string()
		.trim()
		.min(1)
		.optional()
		.describe('What to read, from the working directory; `translations.<format>` by default')
})
