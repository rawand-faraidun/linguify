import { tableMarks } from '@linguify/constants'
import { splitNamespace } from '@linguify/keys'
import type { KeyRow, Locale, NamespaceName, TableMark } from '@linguify/types'

/**
 * what the table is narrowed to; every part left out lets every key through
 */
export type KeyFilter = {
	/**
	 * text to find in a key path, a description or any locale's text, in any letter case
	 */
	search?: string

	/**
	 * keep only keys still to translate in one of these locales — missing or empty there while the
	 * default has them
	 */
	untranslatedIn?: readonly Locale[]

	/**
	 * keep only keys in these namespaces
	 */
	namespaces?: readonly NamespaceName[]
}

/**
 * how far one locale is from the default — exactly what `diff` reports for it
 */
export type LocaleCounts = {
	/**
	 * keys the default has and this locale does not
	 */
	missing: number

	/**
	 * keys the default has and this locale has empty
	 */
	empty: number

	/**
	 * keys this locale has and the default does not — what `sync --remove-unused` removes
	 */
	extra: number
}

/**
 * whether a key still needs translating in a locale
 *
 * @param row - one key
 * @param locale - a locale other than the default
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns whether the key still needs translating there: the default has it, and the locale lacks it
 * or has it empty — `diff`'s missing and empty
 */
export const isUntranslated = ({ values }: KeyRow, locale: Locale, defaultLocale: Locale): boolean =>
	Object.hasOwn(values, defaultLocale) && (!Object.hasOwn(values, locale) || values[locale] === '')

/**
 * whether a key is extra in a locale
 *
 * @param row - one key
 * @param locale - a locale other than the default
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns whether the locale has it and the default does not — `diff`'s extra
 */
export const isExtra = ({ values }: KeyRow, locale: Locale, defaultLocale: Locale): boolean =>
	Object.hasOwn(values, locale) && !Object.hasOwn(values, defaultLocale)

/**
 * how a table marks a key's text in a locale — the same rules `diff` and the counters use
 *
 * @param row - one key
 * @param locale - any locale, the default included
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns its mark, or nothing when its text says it all
 */
export const cellMark = (row: KeyRow, locale: Locale, defaultLocale: Locale): TableMark | undefined => {
	const text = Object.hasOwn(row.values, locale) ? row.values[locale] : undefined
	if (text === undefined) return isUntranslated(row, locale, defaultLocale) ? tableMarks.missing : tableMarks.absent
	if (isExtra(row, locale, defaultLocale)) return tableMarks.extra
	if (text !== '') return undefined
	return locale !== defaultLocale && isUntranslated(row, locale, defaultLocale) ? tableMarks.empty : tableMarks.blank
}

/**
 * counts, per locale, the keys still to translate, and the keys the default no longer has
 *
 * @note counted over every key, never the filtered ones — the counters say how much is left to
 * translate, which a search must not change. The default locale is what the others are measured
 * against, so it has no count
 *
 * @param rows - every key
 * @param locales - every configured locale
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns each other locale's missing, empty and extra keys — `diff`'s three counts
 */
export const countUntranslated = (
	rows: readonly KeyRow[],
	locales: readonly Locale[],
	defaultLocale: Locale
): Record<Locale, LocaleCounts> =>
	Object.fromEntries(
		locales
			.filter(locale => locale !== defaultLocale)
			.map((locale): [Locale, LocaleCounts] => {
				const counts = { missing: 0, empty: 0, extra: 0 }
				for (const row of rows) {
					const mark = cellMark(row, locale, defaultLocale)
					if (mark === tableMarks.missing || mark === tableMarks.empty || mark === tableMarks.extra) counts[mark]++
				}
				return [locale, counts]
			})
	)

/**
 * narrows the keys to what the filter lets through
 *
 * @param rows - every key
 * @param filter - the search, the locales still to translate in, the namespaces
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns the keys every part of the filter lets through, in their order
 */
export const filterKeys = (rows: readonly KeyRow[], filter: KeyFilter, defaultLocale: Locale): KeyRow[] => {
	const needle = filter.search?.trim().toLowerCase() ?? ''
	const namespaces = filter.namespaces === undefined ? undefined : new Set(filter.namespaces)
	const untranslated = filter.untranslatedIn ?? []
	return rows.filter(
		row =>
			(needle === '' ||
				row.key.toLowerCase().includes(needle) ||
				(row.description ?? '').toLowerCase().includes(needle) ||
				Object.values(row.values).some(text => text.toLowerCase().includes(needle))) &&
			(namespaces === undefined || namespaces.has(splitNamespace(row.key).namespace)) &&
			(untranslated.length === 0 || untranslated.some(locale => isUntranslated(row, locale, defaultLocale)))
	)
}
