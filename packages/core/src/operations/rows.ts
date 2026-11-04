import { keyRows } from '@linguify/keys'
import type { Catalogue, KeyRow, Locale } from '@linguify/types'
import type { OperationContext } from './context'

/**
 * one row per key in the catalogue — what `list keys`, the studio table and an export show
 *
 * @note `keyRows` from `@linguify/keys`, which the studio builds its table with: keys in the default
 * locale's order, then the keys only other locales have, in config order
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param locales - the locales whose text to include; every locale when omitted
 *
 * @returns the rows, each with its description when descriptions are on and it has one
 */
export const buildKeyRows = (
	{ config }: OperationContext,
	catalogue: Catalogue,
	locales?: readonly Locale[]
): KeyRow[] =>
	keyRows(
		catalogue,
		{ locales: config.locales, default: config.default, descriptions: config.description.enabled },
		locales
	)
