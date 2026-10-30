import { defaultFileFormat, fileStructures, indentationStyles, maxIndentation } from '@linguify/constants'
import type { EngineOptions } from '@linguify/types'
import { z } from 'zod'

/**
 * the JSON engine's option defaults
 *
 * @note kept with the engine rather than in `@linguify/constants`, so adding an engine never touches
 * anything outside its own folder; the layout follows `defaultFileFormat`, so the translation files and
 * the descriptions file are laid out alike unless the config says otherwise
 */
export const jsonOptionDefaults = {
	fileStructure: fileStructures.single,
	namespaces: true,
	indentation: defaultFileFormat.indentation,
	indentationStyle: defaultFileFormat.indentationStyle,
	finalNewline: defaultFileFormat.finalNewline
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

/**
 * whether a JSON project's keys start with a namespace
 *
 * @param options - the JSON engine's options
 *
 * @returns `true` in multi-file, where every file is a namespace, and otherwise what `namespaces` says
 */
export const isJsonNamespaced = (options: EngineOptions): boolean => {
	const { fileStructure, namespaces } = jsonOptions.parse(options)
	return fileStructure === fileStructures.multi || namespaces
}

/**
 * whether a JSON project writes each namespace to a file of its own
 *
 * @param options - the JSON engine's options
 *
 * @returns `true` in multi-file
 */
export const isJsonNamespaceFiles = (options: EngineOptions): boolean =>
	jsonOptions.parse(options).fileStructure === fileStructures.multi
