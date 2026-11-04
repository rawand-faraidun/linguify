import { errorCodes, keySeparator, reservedKeySegments } from '@linguify/constants'
import type { TranslationNode, TranslationTree } from '@linguify/types'
import { EngineError } from '../errors'
import { isPlainObject } from '../utils'

/**
 * turns a parsed translation file into a tree, rejecting anything a tree cannot hold
 *
 * @note every engine parses its format into plain data and hands it here, so the rules — text and
 * nested groups only, every key addressable — are the same for all of them
 *
 * @param value - what the file parsed to
 * @param file - the file's path, for the error message
 * @param prefix - the key path the value sits at, for nested calls
 *
 * @returns the tree, in file order
 *
 * @throws {@link EngineError} `INVALID_STRUCTURE`, naming the file and the key
 */
export const toTranslationTree = (value: unknown, file: string, prefix: string[] = []): TranslationTree => {
	if (!isPlainObject(value)) throw invalid(file, prefix, `must be a group of keys, not ${describe(value)}`)
	return Object.fromEntries(
		Object.entries(value).map(([segment, node]): [string, TranslationNode] => {
			const path = [...prefix, segment]
			if (segment === '') throw invalid(file, prefix, 'contains an empty key')
			if (segment.includes(keySeparator)) {
				throw invalid(file, path, `contains "${keySeparator}", so linguify could not tell it from a nested key`)
			}
			if (reservedKeySegments.includes(segment)) throw invalid(file, path, 'is a reserved name')
			if (typeof node === 'string') return [segment, node]
			if (isPlainObject(node)) return [segment, toTranslationTree(node, file, path)]
			throw invalid(file, path, `is ${describe(node)}; only text and nested groups are allowed`)
		})
	)
}

/**
 * @param value - an unexpected value
 *
 * @returns a short description of its kind — `an array`, `a number`, `null`
 */
const describe = (value: unknown): string => {
	if (value === null) return 'null'
	if (Array.isArray(value)) return 'an array'
	return `a ${typeof value}`
}

/**
 * @param file - the file holding the problem
 * @param path - the key's path
 * @param problem - what is wrong with it
 *
 * @returns the error to throw
 */
const invalid = (file: string, path: string[], problem: string): EngineError => {
	const key = path.join(keySeparator)
	return new EngineError(`${file}: ${key === '' ? 'the file' : `\`${key}\``} ${problem}`, {
		code: errorCodes.invalidStructure,
		details: { file, key }
	})
}
