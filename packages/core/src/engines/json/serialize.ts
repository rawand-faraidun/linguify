import { join } from 'node:path'
import { errorCodes, fileStructures } from '@linguify/constants'
import { fileClash, findNamespaceFileProblem } from '@linguify/keys'
import type { Locale, TranslationTree } from '@linguify/types'
import type { EngineContext, FileContent } from '../../engine'
import { EngineError } from '../../errors'
import { formatJson } from '../../utils'
import { jsonExtension } from './files'
import { jsonOptions } from './options'

/**
 * turns every locale's tree into JSON files
 *
 * @note single-file writes one file per locale, an empty locale included, so a write creates it;
 * multi-file writes one file per namespace, so an empty locale has none
 *
 * @param context - the locales folder, the locales and the JSON engine's options
 * @param locales - every locale's tree
 *
 * @returns every file the translations occupy, with its complete content
 *
 * @throws {@link EngineError} `INVALID_STRUCTURE` when a multi-file namespace cannot be a file name — a
 * path separator would write outside the locale's folder, and names differing only in case would be
 * one file on a case-insensitive disk
 */
export const serializeJson = (context: EngineContext, locales: Record<Locale, TranslationTree>): FileContent[] => {
	const options = jsonOptions.parse(context.options)
	return context.locales.flatMap((locale): FileContent[] => {
		const tree = locales[locale] ?? {}
		if (options.fileStructure === fileStructures.single) {
			return [{ path: join(context.directory, `${locale}${jsonExtension}`), content: formatJson(tree, options) }]
		}
		const seen = new Map<string, string>()
		return Object.entries(tree).map(([namespace, node]) => {
			const path = join(context.directory, locale, `${namespace}${jsonExtension}`)
			if (findNamespaceFileProblem(namespace, []) !== undefined) {
				throw new EngineError(
					`\`${namespace}\` cannot be a namespace in a multi-file layout: its name becomes a file name, so it may not contain \`/\` or \`\\\``,
					{ code: errorCodes.invalidStructure, details: { locale, key: namespace } }
				)
			}
			const clash = fileClash(namespace, [...seen.values()])
			if (clash !== undefined) {
				throw new EngineError(
					`\`${namespace}\` and \`${clash}\` differ only in case — in a multi-file layout they would be the same file on a case-insensitive file system`,
					{ code: errorCodes.invalidStructure, details: { locale, key: namespace } }
				)
			}
			seen.set(namespace.toLowerCase(), namespace)
			if (typeof node === 'string') {
				throw new EngineError(
					`${path}: \`${namespace}\` is a translation at the top level, which a multi-file layout cannot hold — every top-level key is a namespace file`,
					{ code: errorCodes.invalidStructure, details: { file: path, key: namespace } }
				)
			}
			return { path, content: formatJson(node, options) }
		})
	})
}
