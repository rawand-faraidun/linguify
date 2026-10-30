import { searchFolds, searchIgnored, tableMarks } from '@linguify/constants'
import { splitNamespace } from '@linguify/keys'
import type { KeyPath, KeyRow, Locale, NamespaceName, TableMark } from '@linguify/types'
import type { KeySort } from './sort'

/**
 * what the table is narrowed to
 */
export type KeyFilter = {
	/**
	 * text to find in a key path, a description or any locale's text, in any letter case; empty finds
	 * every key
	 */
	search: string

	/**
	 * keep only keys still to translate in one of these locales — missing or empty there while the
	 * default has them; none keeps every key
	 */
	untranslatedIn: readonly Locale[]

	/**
	 * keep only keys in these namespaces; nothing keeps every namespace
	 */
	namespaces: readonly NamespaceName[] | undefined
}

/**
 * nothing narrowed
 */
export const noFilter: KeyFilter = { search: '', untranslatedIn: [], namespaces: undefined }

/**
 * @param filter - what the table is narrowed to
 *
 * @returns whether anything is narrowed
 */
export const isFiltered = (filter: KeyFilter): boolean => revealsMatches(filter) || filter.namespaces !== undefined

/**
 * whether the filter looks inside keys — a search, or the still-to-translate filter — so every match must
 * be shown, wherever a closed section or key would hide it
 *
 * @param filter - what the table is narrowed to
 *
 * @returns whether a search or the still-to-translate filter is on
 */
export const revealsMatches = ({ search, untranslatedIn }: KeyFilter): boolean =>
	fold(search) !== '' || untranslatedIn.length > 0

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
 * @param counts - one locale's counts
 *
 * @returns how many of its keys are still to translate: missing or empty
 */
export const toTranslate = ({ missing, empty }: LocaleCounts): number => missing + empty

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
 * @note the search folds letter case, compatibility forms, and the Arabic letters an Arabic keyboard types
 * for Kurdish Sorani's own, and ignores joiners and tatweel — in the text and in what is typed
 *
 * @param rows - every key
 * @param filter - the search, the locales still to translate in, the namespaces; a part left out lets
 * every key through
 * @param defaultLocale - the locale every other is compared against
 *
 * @returns the keys every part of the filter lets through, in their order
 */
export const filterKeys = (rows: readonly KeyRow[], filter: Partial<KeyFilter>, defaultLocale: Locale): KeyRow[] => {
	const needle = fold(filter.search ?? '')
	const namespaces = filter.namespaces === undefined ? undefined : new Set(filter.namespaces)
	const untranslated = filter.untranslatedIn ?? []
	return rows.filter(
		row =>
			(needle === '' || searchable(row).includes(needle)) &&
			(namespaces === undefined || namespaces.has(splitNamespace(row.key).namespace)) &&
			(untranslated.length === 0 || untranslated.some(locale => isUntranslated(row, locale, defaultLocale)))
	)
}

/**
 * @param text - a search, or text to search in
 *
 * @returns it as a search compares it: trimmed, folded, lower case
 */
const fold = (text: string): string => {
	let folded = text.normalize('NFKC').toLowerCase()
	for (const ignored of searchIgnored) folded = folded.replaceAll(ignored, '')
	for (const [from, to] of Object.entries(searchFolds)) folded = folded.replaceAll(from, to)
	return folded.trim()
}

/**
 * each key's text as a search reads it, folded once and kept for as long as the key is
 */
const searchTexts = new WeakMap<KeyRow, string>()

/**
 * between a key's texts in what a search reads, so no match runs from one into the next — nothing typed
 * contains it
 */
const textSeparator = '\u0000'

/**
 * @param row - one key
 *
 * @returns its path, description and every locale's text, folded, in one string
 */
const searchable = (row: KeyRow): string => {
	const known = searchTexts.get(row)
	if (known !== undefined) return known
	const text = fold([row.key, row.description ?? '', ...Object.values(row.values)].join(textSeparator))
	searchTexts.set(row, text)
	return text
}

/**
 * the namespaces the keys are in
 *
 * @param rows - every key
 *
 * @returns each namespace once, in the order its first key comes
 */
export const namespacesOf = (rows: readonly KeyRow[]): NamespaceName[] => [
	...new Set(rows.map(row => splitNamespace(row.key).namespace))
]

/**
 * whether the view is narrowed or reordered — by a search, a filter or a sort — so a key just edited could
 * move or vanish from where the person is looking
 *
 * @param filter - what the table is narrowed to
 * @param sort - how it is ordered; nothing for the files' order
 *
 * @returns whether anything narrows or reorders it
 */
export const narrowsView = (filter: KeyFilter, sort: KeySort | undefined): boolean =>
	isFiltered(filter) || sort !== undefined

/**
 * the keys shown while the view is held still: the paths it showed, in that order, read from the keys as
 * they are now
 *
 * @note what an edit there changes moves nowhere and stays shown; a key removed since drops out. Changing
 * the search, a filter or the sort lets go
 *
 * @param rows - every key, as read now
 * @param pinned - the paths shown when the view was held, in their order
 *
 * @returns those keys still there, in that order
 */
export const pinnedKeys = (rows: readonly KeyRow[], pinned: readonly KeyPath[]): KeyRow[] => {
	const byKey = new Map(rows.map(row => [row.key, row]))
	return pinned.flatMap(key => byKey.get(key) ?? [])
}

/**
 * whether a key is there and the view does not show it — narrowed out by a search or a filter
 *
 * @note read from what was written and read back, never guessed beforehand: `keys.fillWithDefault` and
 * the like decide what a new key holds
 *
 * @param rows - every key, as read now
 * @param shown - the keys the view lets through
 * @param path - a key path
 *
 * @returns whether the key exists and is not shown
 */
export const hiddenByView = (rows: readonly KeyRow[], shown: readonly KeyRow[], path: KeyPath): boolean =>
	rows.some(row => row.key === path) && !shown.some(row => row.key === path)

/**
 * the namespaces a view shows as sections though they hold no key — added and not filled yet, or emptied
 *
 * @note none while a search or the still-to-translate filter is on — an empty namespace holds no match —
 * and none the namespace filter leaves out
 *
 * @param namespaces - every namespace there is
 * @param rows - every key
 * @param filter - what the table is narrowed to
 *
 * @returns those empty namespaces, in their order
 */
export const emptyNamespacesShown = (
	namespaces: readonly NamespaceName[],
	rows: readonly KeyRow[],
	filter: KeyFilter
): NamespaceName[] => {
	if (revealsMatches(filter)) return []
	const holding = new Set(namespacesOf(rows))
	return namespaces.filter(
		namespace => !holding.has(namespace) && (filter.namespaces === undefined || filter.namespaces.includes(namespace))
	)
}
