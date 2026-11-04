/**
 * translations as a table — what every export format writes and every import format reads
 *
 * @note the columns are `key`, `description` when descriptions are on, then the default locale, then
 * the rest in config order; every cell is text, and an empty one is `""`
 */
export type Table = {
	header: string[]
	rows: string[][]
}
