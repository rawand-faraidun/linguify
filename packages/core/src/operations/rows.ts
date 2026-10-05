import { flattenTree } from '@linguify/keys'
import type { Catalogue, KeyRow, Locale } from '@linguify/types'
import { getOwn } from '../utils'
import { localeOrder, type OperationContext } from './context'

/**
 * one row per key in the catalogue — what `list keys`, the studio table and an export show
 *
 * @note keys come in the default locale's order, then the keys only other locales have, in config
 * order, so a key missing from the default still gets a row
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
	locales: readonly Locale[] = config.locales
): KeyRow[] => {
	const flat = localeOrder(config).map(locale => ({
		locale,
		translations: flattenTree(catalogue.locales[locale] ?? {})
	}))
	const keys = new Set(flat.flatMap(({ translations }) => Object.keys(translations)))
	const shown = flat.filter(({ locale }) => locales.includes(locale))
	return [...keys].map(key => {
		const values = Object.fromEntries(
			shown.flatMap(({ locale, translations }): [Locale, string][] => {
				const text = getOwn(translations, key)
				return text === undefined ? [] : [[locale, text]]
			})
		)
		const description = config.description.enabled ? getOwn(catalogue.descriptions, key) : undefined
		return description === undefined ? { key, values } : { key, description, values }
	})
}
