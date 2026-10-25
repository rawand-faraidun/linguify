import { sortColumns, sortDirections } from '@linguify/constants'
import { compareKeyPaths } from '@linguify/keys'
import type { KeyRow, Locale, Values } from '@linguify/types'

/**
 * how the table is ordered — on screen only; the files never change
 */
export type KeySort = {
	/**
	 * the key path, or a locale's text
	 */
	column: typeof sortColumns.key | Locale

	direction: Values<typeof sortDirections>
}

/**
 * @param rows - the keys, in their order
 * @param sort - the column and direction
 *
 * @returns them in that order: keys as a sorted tree lists them, texts as the locale itself orders
 * words; a text the locale lacks always last, whichever the direction; equals keep their order
 */
export const sortKeys = (rows: readonly KeyRow[], { column, direction }: KeySort): KeyRow[] => {
	const sign = direction === sortDirections.ascending ? 1 : -1
	if (column === sortColumns.key) return [...rows].sort((a, b) => sign * compareKeyPaths(a.key, b.key))
	const collator = new Intl.Collator(collatorLocale(column), { numeric: true })
	return [...rows].sort((a, b) => {
		const [left, right] = [a.values[column], b.values[column]]
		if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? 1 : -1
		return sign * collator.compare(left, right)
	})
}

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
