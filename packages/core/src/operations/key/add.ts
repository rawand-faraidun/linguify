import { changeKinds, emptyTranslation, errorCodes, warningCodes } from '@linguify/constants'
import { findConflicts, findDuplicate, setTranslation, splitNamespace } from '@linguify/keys'
import type { Catalogue, KeyPath, Locale, TranslationTree } from '@linguify/types'
import { NotFoundError } from '../../errors'
import type { OperationContext } from '../context'
import { requireDescriptions, requireKeyPath } from '../guards'
import type { OperationResult } from '../report'
import { collectGivenText, notAssignable } from './shared'

/**
 * `key add`'s input
 */
export type AddKeyInput = {
	path: KeyPath

	/**
	 * the default locale's text; `""` when omitted
	 */
	value?: string | undefined

	/**
	 * text for other locales; a locale left out gets `""`, or the default locale's text under
	 * `keys.fillWithDefault`
	 */
	translations?: Record<Locale, string> | undefined

	description?: string | undefined

	/**
	 * create the key's namespace when it does not exist, instead of failing
	 */
	createNamespace?: boolean | undefined
}

/**
 * adds a key to every locale
 *
 * @note the default locale gets `value` (or `""`); a locale `translations` leaves out gets `""`, or the
 * default's text under `keys.fillWithDefault`. The key goes at the bottom of its level. A key that
 * already exists is a warning and changes nothing, so running the same `key add` twice is safe. An
 * empty `description` adds none
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `key add`'s input
 *
 * @returns the catalogue with the key, and the report
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for an unusable path or the default's text given twice,
 * `DESCRIPTIONS_DISABLED` for a description while descriptions are off
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN` for a translation in an unknown locale,
 * `NAMESPACE_NOT_FOUND` when the namespace does not exist and creating it is not allowed
 * @throws {@link ConflictError} `KEY_NOT_ASSIGNABLE` when a locale has nested keys at the path, or a
 * translation on the way to it
 */
export const addKey = (context: OperationContext, catalogue: Catalogue, input: AddKeyInput): OperationResult => {
	const { config } = context
	const { path, description = '' } = input
	requireKeyPath(context, path)
	const given = collectGivenText(context, input)
	if (input.description !== undefined) requireDescriptions(context)

	const holders = findDuplicate(catalogue, path)
	if (holders.length > 0) {
		const where = holders.map(locale => `\`${locale}\``).join(', ')
		return {
			catalogue,
			report: {
				changes: [],
				warnings: [
					{ code: warningCodes.keyExists, path, message: `\`${path}\` already exists in ${where}; nothing changed` }
				]
			}
		}
	}

	const [conflict, ...conflicts] = findConflicts(catalogue, path)
	if (conflict !== undefined) throw notAssignable(path, [conflict, ...conflicts])

	if (context.namespaced) {
		const { namespace } = splitNamespace(path)
		const exists = Object.values(catalogue.locales).some(tree => Object.hasOwn(tree, namespace))
		if (!exists && !(input.createNamespace ?? config.keys.createNamespace)) {
			throw new NotFoundError(
				`The namespace \`${namespace}\` does not exist. Create it first, or allow \`key add\` to create it (\`keys.createNamespace\`)`,
				{ code: errorCodes.namespaceNotFound, details: { namespace, path } }
			)
		}
	}

	const defaultText = given.get(config.default) ?? emptyTranslation
	const fallback = config.keys.fillWithDefault ? defaultText : emptyTranslation
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => [
			locale,
			setTranslation(catalogue.locales[locale] ?? {}, path, given.get(locale) ?? fallback)
		])
	)
	const described = description !== ''
	return {
		catalogue: {
			locales,
			descriptions: described ? { ...catalogue.descriptions, [path]: description } : catalogue.descriptions
		},
		report: {
			changes: [
				{
					kind: changeKinds.added,
					path,
					locales: [...config.locales],
					...(described ? { description: true as const } : {})
				}
			],
			warnings: []
		}
	}
}
