import { diffKinds, diffText } from '@linguify/constants'
import type { KeyPath, Locale } from '@linguify/types'

/**
 * one way a locale can differ from the default
 */
export type DiffKind = (typeof diffKinds)[number]

/**
 * how one locale differs from the default: the keys of each kind
 */
export type LocaleDifferences = { locale: Locale } & Record<DiffKind, readonly KeyPath[]>

/**
 * @param diff - one locale's differences
 *
 * @returns how many of each kind, the empty kinds left out — `3 missing · 1 empty` — or that it is in sync
 */
export const diffTally = (diff: LocaleDifferences): string => {
	const counts = diffKinds.filter(kind => diff[kind].length > 0).map(kind => `${diff[kind].length} ${kind}`)
	return counts.length === 0 ? diffText.inSync : counts.join(diffText.separator)
}

/**
 * @param diffs - each locale's differences
 *
 * @returns that there is nothing to compare, or that everything is in sync — or nothing, when a locale
 * differs
 */
export const inSyncVerdict = (diffs: readonly LocaleDifferences[]): string | undefined => {
	if (diffs.length === 0) return diffText.onlyDefault
	if (diffs.some(diff => diffKinds.some(kind => diff[kind].length > 0))) return undefined
	const [only] = diffs
	return diffs.length === 1 && only !== undefined
		? diffText.localeInSync.replace('{locale}', only.locale)
		: diffText.allInSync
}
