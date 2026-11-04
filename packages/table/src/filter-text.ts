import { studioText } from '@linguify/constants'
import type { Locale, NamespaceName } from '@linguify/types'
import { isFiltered, type KeyFilter, type LocaleCounts, toTranslate } from './filter'
import { countKeys, fill, keysWord, numbers } from './words'

/**
 * @param filter - the view's filter
 * @param namespaces - every namespace
 *
 * @returns the namespace filter's button: its name, and how many are chosen of how many
 */
export const namespaceFilterLabel = (filter: KeyFilter, namespaces: readonly NamespaceName[]): string =>
	filter.namespaces === undefined
		? studioText.namespaces
		: fill(studioText.chosen, {
				label: studioText.namespaces,
				chosen: fill(studioText.chosenOf, {
					count: numbers.format(filter.namespaces.length),
					total: numbers.format(namespaces.length)
				})
			})

/**
 * @param filter - the view's filter
 * @param locales - the locales it can choose, in order
 *
 * @returns the missing filter's button: its name, and the locales chosen — named when two or fewer, else
 * how many of how many
 */
export const untranslatedFilterLabel = (filter: KeyFilter, locales: readonly Locale[]): string => {
	const chosen = locales.filter(locale => filter.untranslatedIn.includes(locale))
	return chosen.length === 0
		? studioText.untranslated
		: fill(studioText.chosen, {
				label: studioText.untranslated,
				chosen:
					chosen.length <= 2
						? chosen.join(studioText.listSeparator)
						: fill(studioText.chosenOf, { count: numbers.format(chosen.length), total: numbers.format(locales.length) })
			})
}

/**
 * @param filter - the view's filter
 * @param namespaces - every namespace, in order
 * @param namespace - the namespace ticked or unticked
 * @param checked - whether it is now ticked
 *
 * @returns the filter with it chosen or not — none chosen shows them all
 */
export const toggleNamespace = (
	filter: KeyFilter,
	namespaces: readonly NamespaceName[],
	namespace: NamespaceName,
	checked: boolean
): KeyFilter => {
	const next = namespaces.filter(name => (name === namespace ? checked : (filter.namespaces?.includes(name) ?? false)))
	return { ...filter, namespaces: next.length === 0 ? undefined : next }
}

/**
 * @param filter - the view's filter
 * @param locale - the locale ticked or unticked in the missing filter
 * @param checked - whether it is now ticked
 *
 * @returns the filter with it chosen or not
 */
export const toggleUntranslated = (filter: KeyFilter, locale: Locale, checked: boolean): KeyFilter => {
	const chosen = filter.untranslatedIn.filter(name => name !== locale)
	return { ...filter, untranslatedIn: checked ? [...chosen, locale] : chosen }
}

/**
 * @param counts - a locale's counts
 *
 * @returns how many it has to translate and how many extra, in words — each surface sets them apart its own
 * way, saying `studioText.listSeparator` between them
 */
export const localeCountsText = (counts: LocaleCounts) => ({
	untranslated: fill(studioText.untranslatedCount, { count: numbers.format(toTranslate(counts)) }),
	extra: fill(studioText.extraCount, { count: numbers.format(counts.extra) })
})

/**
 * @param filter - the view's filter
 * @param shown - how many keys it shows
 * @param total - how many keys there are
 *
 * @returns how many keys match of how many, when filtered — else how many keys
 */
export const matchCountText = (filter: KeyFilter, shown: number, total: number): string =>
	isFiltered(filter)
		? fill(studioText.matchCount, { shown: numbers.format(shown), total: numbers.format(total), keys: keysWord(total) })
		: countKeys(total)
