import { sortColumns, sortDirections, viewModes } from '@linguify/constants'
import { compareKeyPaths } from '@linguify/keys'
import type { KeyRow, Locale, Values, ViewMode } from '@linguify/types'

/**
 * how the table is ordered — on screen only; the files never change
 */
export type KeySort = {
	/**
	 * the key path, or one locale's text — never a bare string, so a locale named `key` is still a locale
	 */
	column: { by: typeof sortColumns.key } | { by: typeof sortColumns.locale; locale: Locale }

	direction: Values<typeof sortDirections>
}

/**
 * orders the keys on screen — never in the files
 *
 * @param rows - the keys, in their order
 * @param sort - the column and direction
 *
 * @returns them in that order: keys as a sorted tree lists them, texts as the locale itself orders
 * words; a text the locale lacks or has empty always last, whichever the direction — it is not a word to
 * sort, but a translation still to do; equals keep their order
 */
export const sortKeys = (rows: readonly KeyRow[], { column, direction }: KeySort): KeyRow[] => {
	const sign = direction === sortDirections.ascending ? 1 : -1
	if (column.by === sortColumns.key) return [...rows].sort((a, b) => sign * compareKeyPaths(a.key, b.key))
	const { locale } = column
	const collator = new Intl.Collator(collatorLocale(locale), { numeric: true })
	return [...rows].sort((a, b) => {
		const [left, right] = [a.values[locale] || undefined, b.values[locale] || undefined]
		if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? 1 : -1
		return sign * collator.compare(left, right)
	})
}

/**
 * what a column's header does when pressed: sort by it ascending, then descending, then not at all
 *
 * @param current - how the table is ordered now; nothing when in the files' order
 * @param column - the column pressed
 *
 * @returns the next order — nothing for the files' own
 */
export const nextSort = (current: KeySort | undefined, column: KeySort['column']): KeySort | undefined => {
	if (current === undefined || !sameColumn(current.column, column))
		return { column, direction: sortDirections.ascending }
	return current.direction === sortDirections.ascending ? { column, direction: sortDirections.descending } : undefined
}

/**
 * whether two columns are the same: both the key, or the same locale
 *
 * @param a - a column
 * @param b - another
 *
 * @returns whether they are the same column
 */
export const sameColumn = (a: KeySort['column'], b: KeySort['column']): boolean =>
	a.by === sortColumns.key ? b.by === sortColumns.key : b.by === sortColumns.locale && a.locale === b.locale

/**
 * whether a view shows a column, so a sort by it can be seen — the compact view shows the key and the
 * default locale only
 *
 * @param column - a column
 * @param mode - the view mode
 * @param defaultLocale - the default locale
 *
 * @returns whether the view shows it
 */
export const columnShown = (column: KeySort['column'], mode: ViewMode, defaultLocale: Locale): boolean =>
	mode !== viewModes.compact || column.by === sortColumns.key || column.locale === defaultLocale

/**
 * @param locale - a configured locale code
 *
 * @returns it when `Intl` knows it — `ckb` — else the default collation; a code the config allows,
 * such as `zh_Hant`, is not always one `Intl` accepts
 */
const collatorLocale = (locale: Locale): string | undefined => {
	try {
		return Intl.Collator.supportedLocalesOf(locale).length > 0 ? locale : undefined
	} catch {
		return undefined
	}
}
