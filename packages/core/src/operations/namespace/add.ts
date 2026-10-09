import { changeKinds, warningCodes } from '@linguify/constants'
import type { Catalogue, Locale, NamespaceName, TranslationTree } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireNamespaceName } from '../guards'
import type { OperationResult } from '../report'
import { findNamespaceHolders } from './shared'

/**
 * `namespace add`'s input
 */
export type AddNamespaceInput = {
	name: NamespaceName
}

/**
 * adds an empty namespace to every locale
 *
 * @note it goes at the bottom of each file in single-file, and is a new `{}` file per locale in
 * multi-file. A namespace that already exists is a warning and changes nothing, so running the same
 * `namespace add` twice is safe — as with `key add`
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `namespace add`'s input
 *
 * @returns the catalogue with the namespace, and the report
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED`, or `INVALID_INPUT` for a name that cannot be a
 * namespace
 */
export const addNamespace = (
	context: OperationContext,
	catalogue: Catalogue,
	{ name }: AddNamespaceInput
): OperationResult => {
	requireNamespaceName(context, name)
	const holders = findNamespaceHolders(context, catalogue, name)
	if (holders.length > 0) {
		const where = holders.map(locale => `\`${locale}\``).join(', ')
		return {
			catalogue,
			report: {
				changes: [],
				warnings: [
					{
						code: warningCodes.namespaceExists,
						path: name,
						message: `The namespace \`${name}\` already exists in ${where}; nothing changed`
					}
				]
			}
		}
	}

	const { locales } = context.config
	return {
		catalogue: {
			...catalogue,
			locales: Object.fromEntries(
				locales.map((locale): [Locale, TranslationTree] => [locale, { ...catalogue.locales[locale], [name]: {} }])
			)
		},
		report: { changes: [{ kind: changeKinds.added, path: name, locales: [...locales] }], warnings: [] }
	}
}
