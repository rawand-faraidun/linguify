import { flattenTree } from '@linguify/keys'
import type { Catalogue, KeyRow, Locale } from '@linguify/types'

/**
 * the project facts the rows depend on
 */
export type RowSource = {
	/**
	 * every configured locale, in config order
	 */
	locales: readonly Locale[]

	/**
	 * the locale every other is compared against
	 */
	default: Locale

	/**
	 * whether descriptions are on
	 */
	descriptions: boolean
}

/**
 * the locales in the order the table shows them
 *
 * @param source - the locales and the default
 *
 * @returns the default first, then the others in config order
 */
export const localeOrder = (source: Pick<RowSource, 'locales' | 'default'>): Locale[] => [
	source.default,
	...source.locales.filter(locale => locale !== source.default)
]

/**
 * one row per key in a catalogue — what `list keys` gives, built in the browser from `catalogue.get`
 *
 * @note the same rows, in the same order, as core's: the default locale's keys first, then those only
 * other locales have, in config order; a locale without a key is left out of its values
 *
 * @param catalogue - every locale's tree and the descriptions
 * @param source - the locales, the default, and whether descriptions are on
 *
 * @returns the rows
 */
export const rowsFromCatalogue = (catalogue: Catalogue, source: RowSource): KeyRow[] => {
	const flat = localeOrder(source).map(locale => ({
		locale,
		translations: flattenTree(catalogue.locales[locale] ?? {})
	}))
	const keys = new Set(flat.flatMap(({ translations }) => Object.keys(translations)))
	return [...keys].map(key => {
		const values = Object.fromEntries(
			flat.flatMap(({ locale, translations }): [Locale, string][] => {
				const text = Object.hasOwn(translations, key) ? translations[key] : undefined
				return text === undefined ? [] : [[locale, text]]
			})
		)
		const description =
			source.descriptions && Object.hasOwn(catalogue.descriptions, key) ? catalogue.descriptions[key] : undefined
		return description === undefined ? { key, values } : { key, description, values }
	})
}
