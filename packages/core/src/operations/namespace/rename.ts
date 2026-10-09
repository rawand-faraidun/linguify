import { changeKinds, errorCodes } from '@linguify/constants'
import type { Catalogue, Locale, NamespaceName, TranslationTree } from '@linguify/types'
import { ConflictError } from '../../errors'
import type { OperationContext } from '../context'
import { requireNamespaceName } from '../guards'
import { invalid, moveDescriptions, renameInPlace } from '../key/shared'
import type { OperationResult } from '../report'
import { findNamespaceHolders, namespaceNotFound } from './shared'

/**
 * `namespace rename`'s input — renames it in every locale
 */
export type RenameNamespaceInput = {
	from: NamespaceName
	to: NamespaceName
}

/**
 * renames a namespace in every locale that has it, with the descriptions of its keys
 *
 * @note it keeps its place in single-file; in multi-file the file is renamed, which the write plan
 * carries out as one write and one delete per locale
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `namespace rename`'s input
 *
 * @returns the renamed catalogue, and the report
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED`, or `INVALID_INPUT` for a name that cannot be a
 * namespace or the same name twice
 * @throws {@link NotFoundError} `NAMESPACE_NOT_FOUND` when no locale has `from`
 * @throws {@link ConflictError} `NAMESPACE_EXISTS` when any locale already has `to`
 */
export const renameNamespace = (
	context: OperationContext,
	catalogue: Catalogue,
	{ from, to }: RenameNamespaceInput
): OperationResult => {
	requireNamespaceName(context, from)
	requireNamespaceName(context, to)
	if (from === to) throw invalid(`\`${from}\` is already the namespace's name`)

	const holders = findNamespaceHolders(context, catalogue, from)
	if (holders.length === 0) throw namespaceNotFound(from)
	const taken = findNamespaceHolders(context, catalogue, to)
	if (taken.length > 0) {
		throw new ConflictError(
			`The namespace \`${to}\` already exists in ${taken.map(locale => `\`${locale}\``).join(', ')}`,
			{ code: errorCodes.namespaceExists, details: { namespace: to, locales: taken } }
		)
	}

	const locales = Object.fromEntries(
		context.config.locales.map((locale): [Locale, TranslationTree] => {
			const tree = catalogue.locales[locale] ?? {}
			return [locale, holders.includes(locale) ? renameInPlace(tree, from, to) : tree]
		})
	)
	const descriptions = moveDescriptions(catalogue.descriptions, from, to)
	return {
		catalogue: { locales, descriptions },
		report: {
			changes: [
				{
					kind: changeKinds.renamed,
					path: to,
					from,
					locales: holders,
					...(descriptions === catalogue.descriptions ? {} : { description: true as const })
				}
			],
			warnings: []
		}
	}
}
