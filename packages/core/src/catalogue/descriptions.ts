import { join } from 'node:path'
import { defaultFileFormat, errorCodes, indentationStyles, maxIndentation } from '@linguify/constants'
import { findKeyPathProblem } from '@linguify/keys'
import type { Descriptions, LoadedConfig } from '@linguify/types'
import { z } from 'zod'
import { type FileContent, type FileSnapshot, readSnapshot } from '../engine'
import { EngineError } from '../errors'
import { type FormatOptions, formatJson, isPlainObject, stripByteOrderMark } from '../utils'

/**
 * the formatting keys an engine's options may share with the descriptions file
 */
const formatKeys = z
	.object({
		indentation: z.int().min(0).max(maxIndentation),
		indentationStyle: z.enum(indentationStyles),
		finalNewline: z.boolean()
	})
	.partial()

/**
 * where the descriptions file lives
 *
 * @param loaded - the loaded config
 *
 * @returns its absolute path — `description.name` inside the locales folder
 */
export const descriptionsPath = ({ config, localesDirectory }: LoadedConfig): string =>
	join(localesDirectory, config.description.name)

/**
 * reads the descriptions file, when descriptions are on
 *
 * @param loaded - the loaded config
 *
 * @returns the descriptions — empty when they are off or the file does not exist yet — and the file's
 * snapshot, absent when descriptions are off
 *
 * @throws {@link EngineError} `FILE_INVALID` for a file that cannot be read or is not valid JSON,
 * `INVALID_STRUCTURE` for anything but a flat map of key paths to text
 */
export const readDescriptions = async (
	loaded: LoadedConfig
): Promise<{ descriptions: Descriptions; snapshot?: FileSnapshot }> => {
	if (!loaded.config.description.enabled) return { descriptions: {} }

	const snapshot = await readSnapshot(descriptionsPath(loaded))
	const { path, content } = snapshot
	if (content === null) return { descriptions: {}, snapshot }

	let value: unknown
	try {
		value = JSON.parse(stripByteOrderMark(content))
	} catch (error) {
		throw new EngineError(`${path} is not valid JSON: ${(error as Error).message}`, {
			code: errorCodes.fileInvalid,
			details: { file: path },
			cause: error
		})
	}
	if (!isPlainObject(value)) throw invalid(path, '', 'must be a flat map of key paths to text')

	const entries = Object.entries(value).map(([key, text]): [string, string] => {
		const problem = findKeyPathProblem(key)
		if (problem !== undefined) throw invalid(path, key, `is not a usable key path (${problem})`)
		if (typeof text !== 'string') throw invalid(path, key, 'must describe its key with text')
		return [key, text]
	})
	return { descriptions: Object.fromEntries(entries), snapshot }
}

/**
 * turns the descriptions into their file, when descriptions are on
 *
 * @note formatted like the rest of the project: the engine's options supply indentation, style and the
 * final newline when they have them, the defaults fill in the rest
 *
 * @param loaded - the loaded config
 * @param descriptions - the descriptions
 *
 * @returns the file, or `undefined` when descriptions are off
 */
export const serializeDescriptions = (loaded: LoadedConfig, descriptions: Descriptions): FileContent | undefined => {
	if (!loaded.config.description.enabled) return undefined
	const shared = formatKeys.safeParse(loaded.config.options)
	const own = shared.success ? shared.data : {}
	const format: FormatOptions = {
		indentation: own.indentation ?? defaultFileFormat.indentation,
		indentationStyle: own.indentationStyle ?? defaultFileFormat.indentationStyle,
		finalNewline: own.finalNewline ?? defaultFileFormat.finalNewline
	}
	return { path: descriptionsPath(loaded), content: formatJson(descriptions, format) }
}

/**
 * @param file - the descriptions file
 * @param key - the offending key, or `''` for the whole file
 * @param problem - what is wrong
 *
 * @returns the error to throw
 */
const invalid = (file: string, key: string, problem: string): EngineError =>
	new EngineError(`${file}: ${key === '' ? 'the file' : `\`${key}\``} ${problem}`, {
		code: errorCodes.invalidStructure,
		details: { file, key }
	})
