import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { errorCodes, fileErrorCodes, fileStructures } from '@linguify/constants'
import { compareSegments } from '@linguify/keys'
import type { FileStructure, TranslationTree } from '@linguify/types'
import {
	type EngineContext,
	type EngineReading,
	type FileSnapshot,
	readSnapshot,
	toTranslationTree
} from '../../engine'
import { EngineError } from '../../errors'
import { stripByteOrderMark } from '../../utils'
import { jsonExtension } from './files'
import { jsonOptions } from './options'

/**
 * reads every configured locale from JSON files
 *
 * @param context - the locales folder, the locales and the JSON engine's options
 *
 * @returns every locale's tree, and every file looked at
 */
export const readJson = async (context: EngineContext): Promise<EngineReading> => {
	const options = jsonOptions.parse(context.options)
	const files: FileSnapshot[] = []
	const trees: [string, TranslationTree][] = []
	for (const locale of context.locales) {
		const file = join(context.directory, `${locale}${jsonExtension}`)
		const folder = join(context.directory, locale)
		const tree =
			options.fileStructure === fileStructures.multi
				? await readLocaleFolder(folder, file, files)
				: await readLocaleFile(file, folder, options.namespaces, files)
		trees.push([locale, tree])
	}
	return { locales: Object.fromEntries(trees), files }
}

/**
 * reads a single-file locale — `en.json`
 *
 * @param file - the locale's file
 * @param folder - where a multi-file layout would keep the same locale, to detect a layout mismatch
 * @param namespaced - whether every top-level key must be a namespace
 * @param files - where to record what was read
 *
 * @returns the locale's tree; empty when the file does not exist yet
 */
const readLocaleFile = async (
	file: string,
	folder: string,
	namespaced: boolean,
	files: FileSnapshot[]
): Promise<TranslationTree> => {
	const { content } = await readSnapshot(file)
	files.push({ path: file, content })
	if (content === null) {
		if ((await listNamespaceFiles(folder)).length > 0) {
			throw layoutMismatch(`${file} does not exist, but ${folder} holds namespace files`, fileStructures.multi)
		}
		return {}
	}

	const tree = toTranslationTree(parseJson(content, file), file)
	if (namespaced) {
		const translation = Object.entries(tree).find(([, node]) => typeof node === 'string')
		if (translation !== undefined) {
			throw new EngineError(
				`${file}: \`${translation[0]}\` is a translation at the top level, but namespaces are on — every top-level key must be a namespace. Turn \`options.namespaces\` off if the file has none`,
				{ code: errorCodes.invalidStructure, details: { file, key: translation[0] } }
			)
		}
	}
	return tree
}

/**
 * reads a multi-file locale — `en/common.json`, `en/home.json`, … — one namespace per file
 *
 * @param folder - the locale's folder
 * @param file - where a single-file layout would keep the same locale, to detect a layout mismatch
 * @param files - where to record what was read
 *
 * @returns the locale's tree, namespaces in collation order; empty when the folder does not exist yet
 */
const readLocaleFolder = async (folder: string, file: string, files: FileSnapshot[]): Promise<TranslationTree> => {
	const names = await listNamespaceFiles(folder)
	if (names.length === 0 && (await readSnapshot(file)).content !== null) {
		throw layoutMismatch(`${folder} holds no namespace files, but ${file} exists`, fileStructures.single)
	}

	const namespaces: [string, unknown][] = []
	for (const name of names) {
		const snapshot = await readSnapshot(join(folder, name))
		files.push(snapshot)
		if (snapshot.content !== null)
			namespaces.push([basename(name, jsonExtension), parseJson(snapshot.content, snapshot.path)])
	}
	return Object.fromEntries(
		namespaces.map(([namespace, value]) => {
			const path = join(folder, `${namespace}${jsonExtension}`)
			toTranslationTree({ [namespace]: {} }, path)
			return [namespace, toTranslationTree(value, path, [namespace])]
		})
	)
}

/**
 * lists a locale folder's namespace files
 *
 * @note a symlink to a file counts, as in single-file, where reading follows it
 *
 * @param folder - the locale's folder
 *
 * @returns the JSON files' names, in collation order — the same on every file system; none when the
 * folder does not exist
 *
 * @throws {@link EngineError} `INVALID_STRUCTURE` for a file ending in `.JSON` or another casing:
 * ignoring it would let a write of the same namespace replace it on a case-insensitive disk
 */
const listNamespaceFiles = async (folder: string): Promise<string[]> => {
	let entries: Dirent[]
	try {
		entries = await readdir(folder, { withFileTypes: true })
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code
		if (code === fileErrorCodes.notFound || code === fileErrorCodes.notADirectory) return []
		throw error
	}

	const names: string[] = []
	for (const entry of entries) {
		const extension = extname(entry.name)
		if (extension.toLowerCase() !== jsonExtension || !(await isFile(folder, entry))) continue
		if (extension !== jsonExtension) {
			const path = join(folder, entry.name)
			throw new EngineError(
				`${path}: namespace files end in \`${jsonExtension}\` — rename it to \`${basename(entry.name, extension)}${jsonExtension}\``,
				{ code: errorCodes.invalidStructure, details: { file: path } }
			)
		}
		names.push(entry.name)
	}
	return names.sort(compareSegments)
}

/**
 * @param folder - the folder holding the entry
 * @param entry - one of its entries
 *
 * @returns whether the entry is a file, or a symlink that leads to one
 */
const isFile = async (folder: string, entry: Dirent): Promise<boolean> => {
	if (entry.isFile()) return true
	if (!entry.isSymbolicLink()) return false
	return stat(join(folder, entry.name)).then(
		target => target.isFile(),
		() => false
	)
}

/**
 * parses one file's JSON
 *
 * @param content - the file's text
 * @param file - its path, for the error message
 *
 * @returns the parsed value
 *
 * @throws {@link EngineError} `FILE_INVALID` when the text is not valid JSON
 */
const parseJson = (content: string, file: string): unknown => {
	try {
		return JSON.parse(stripByteOrderMark(content))
	} catch (error) {
		throw new EngineError(`${file} is not valid JSON: ${(error as Error).message}`, {
			code: errorCodes.fileInvalid,
			details: { file },
			cause: error
		})
	}
}

/**
 * @param found - what was found on disk
 * @param layout - the layout the files actually use
 *
 * @returns the error explaining the mismatch and the setting to change
 */
const layoutMismatch = (found: string, layout: FileStructure): EngineError =>
	new EngineError(`${found}. The files look ${layout}: set \`options.fileStructure\` to \`${layout}\``, {
		code: errorCodes.invalidStructure,
		details: { layout }
	})
