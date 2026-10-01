import { fileStructures, indentationStyles, maxIndentation } from '@linguify/constants'
import { z } from 'zod'

/**
 * the JSON engine's option defaults
 *
 * @note kept with the engine rather than in `@linguify/constants`, so adding an engine never touches
 * anything outside its own folder
 */
export const jsonOptionDefaults = {
	fileStructure: fileStructures.single,
	namespaces: true,
	indentation: 2,
	indentationStyle: indentationStyles.space,
	finalNewline: true
} as const

/**
 * the JSON engine's `options` schema
 *
 * @note strict, so an option that belongs to another engine is an error rather than silently ignored
 */
export const jsonOptions = z.strictObject({
	fileStructure: z
		.enum(fileStructures)
		.default(jsonOptionDefaults.fileStructure)
		.describe(
			'How each locale is laid out: `single-file` writes one file per locale (`en.json`), `multi-file` one folder per locale with a file per namespace (`en/common.json`)'
		),
	namespaces: z
		.boolean()
		.default(jsonOptionDefaults.namespaces)
		.describe(
			'Whether the first segment of every key is a namespace. Ignored in multi-file, which is always namespaced'
		),
	indentation: z
		.int()
		.min(0)
		.max(maxIndentation)
		.default(jsonOptionDefaults.indentation)
		.describe(
			'Spaces per indentation level in written files; `0` writes each file on one line. With tabs, each level is one tab'
		),
	indentationStyle: z
		.enum(indentationStyles)
		.default(jsonOptionDefaults.indentationStyle)
		.describe('Indent written files with spaces or tabs'),
	finalNewline: z.boolean().default(jsonOptionDefaults.finalNewline).describe('End every written file with a newline')
})

/**
 * the JSON engine's options, with every default applied
 */
export type JsonOptions = z.output<typeof jsonOptions>
