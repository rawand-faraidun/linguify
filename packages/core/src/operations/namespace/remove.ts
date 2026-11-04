import { changeKinds } from '@linguify/constants'
import { removeNode } from '@linguify/keys'
import type { Catalogue, Locale, NamespaceName, TranslationTree } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireNamespaceName } from '../guards'
import { dropDescriptions } from '../key/shared'
import type { OperationResult } from '../report'
import { findNamespaceHolders, namespaceNotFound } from './shared'

/**
 * `namespace remove`'s input — removes the namespace and every key in it, from every locale
 */
export type RemoveNamespaceInput = {
	name: NamespaceName
}

/**
 * removes a namespace and every key in it from every locale, with their descriptions
 *
 * @note in multi-file its files are deleted. Asking for confirmation is the caller's job — the CLI
 * asks unless `--yes`
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `namespace remove`'s input
 *
 * @returns the catalogue without the namespace, and the report
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED`, or `INVALID_INPUT` for a name that cannot be a
 * namespace
 * @throws {@link NotFoundError} `NAMESPACE_NOT_FOUND` when no locale has it
 */
export const removeNamespace = (
	context: OperationContext,
	catalogue: Catalogue,
	{ name }: RemoveNamespaceInput
): OperationResult => {
	requireNamespaceName(context, name)
	const holders = findNamespaceHolders(context, catalogue, name)
	if (holders.length === 0) throw namespaceNotFound(name)

	const locales = Object.fromEntries(
		context.config.locales.map((locale): [Locale, TranslationTree] => [
			locale,
			removeNode(catalogue.locales[locale] ?? {}, name)
		])
	)
	const descriptions = dropDescriptions(catalogue.descriptions, name)
	return {
		catalogue: { locales, descriptions },
		report: {
			changes: [
				{
					kind: changeKinds.removed,
					path: name,
					locales: holders,
					...(descriptions === catalogue.descriptions ? {} : { description: true as const })
				}
			],
			warnings: []
		}
	}
}
