import type { Catalogue, KeyRow, ListKeysInput } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireLocale } from '../guards'
import { buildKeyRows } from '../rows'

/**
 * lists every key with its text in each locale
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `list keys`' input
 *
 * @returns one row per key; with `locale`, only that locale's text, though every key is still listed
 *
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN` when `locale` is not configured
 */
export const listKeys = (context: OperationContext, catalogue: Catalogue, input: ListKeysInput = {}): KeyRow[] => {
	if (input.locale === undefined) return buildKeyRows(context, catalogue)
	requireLocale(context, input.locale)
	return buildKeyRows(context, catalogue, [input.locale])
}
