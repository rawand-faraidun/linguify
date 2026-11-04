import { translationGaps } from '@linguify/constants'
import type { Catalogue, KeyRow, Locale, TranslationGap } from '@linguify/types'
import { flattenTree } from './tree'

/**
 * the project facts a key's rows depend on
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
 * the locales in the order every surface shows them
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
 * one row per key in a catalogue — what `list keys`, an export and the studio's table show
 *
 * @note keys come in the default locale's order, then the keys only other locales have, in config order,
 * so a key missing from the default still gets a row; a locale without a key is left out of its values
 *
 * @param catalogue - every locale's tree and the descriptions
 * @param source - the locales, the default, and whether descriptions are on
 * @param shown - the locales whose text to include; every locale when left out
 *
 * @returns the rows, each with its description when descriptions are on and it has one
 */
export const keyRows = (
	catalogue: Catalogue,
	source: RowSource,
	shown: readonly Locale[] = source.locales
): KeyRow[] => {
	const flat = localeOrder(source).map(locale => ({
		locale,
		translations: flattenTree(catalogue.locales[locale] ?? {})
	}))
	const keys = new Set(flat.flatMap(({ translations }) => Object.keys(translations)))
	const included = flat.filter(({ locale }) => shown.includes(locale))
	return [...keys].map(key => {
		const values = Object.fromEntries(
			included.flatMap(({ locale, translations }): [Locale, string][] => {
				const text = Object.hasOwn(translations, key) ? translations[key] : undefined
				return text === undefined ? [] : [[locale, text]]
			})
		)
		const description =
			source.descriptions && Object.hasOwn(catalogue.descriptions, key) ? catalogue.descriptions[key] : undefined
		return description === undefined ? { key, values } : { key, description, values }
	})
}

/**
 * how a locale's text for a key falls short of the default's — the one rule `diff`, the table's marks and
 * its counters use
 *
 * @param source - the default locale's text, or `undefined` when it lacks the key
 * @param target - the locale's text, or `undefined` when it lacks the key
 *
 * @returns missing, empty or extra — or nothing when the locale is as the default expects
 */
export const translationGap = (source: string | undefined, target: string | undefined): TranslationGap | undefined => {
	if (source === undefined) return target === undefined ? undefined : translationGaps.extra
	if (target === undefined) return translationGaps.missing
	return target === '' ? translationGaps.empty : undefined
}
