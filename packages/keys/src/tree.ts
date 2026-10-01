import { keyCollation, keySeparator } from '@linguify/constants'
import type { FlatTranslations, TranslationNode, TranslationTree } from '@linguify/types'
import { flatten, unflatten } from 'flat'

/**
 * {@link pruneTree} options
 */
export type PruneOptions = {
	/**
	 * keep first-level groups even when empty, so an empty namespace survives
	 */
	keepTopLevel?: boolean
}

/**
 * flattens a tree into full key paths and their translations
 *
 * @note empty groups have no translation, so they do not appear
 *
 * @param tree - tree to flatten
 *
 * @returns every translation by full key path, in tree order
 */
export const flattenTree = (tree: TranslationTree): FlatTranslations =>
	Object.fromEntries(
		Object.entries(flatten<TranslationTree, Record<string, unknown>>(tree, { delimiter: keySeparator })).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string'
		)
	)

/**
 * nests full key paths back into a tree
 *
 * @note `object: true` keeps numeric segments such as `errors.404` as object keys; without it they
 * would turn into array indexes
 *
 * @param translations - translations by full key path
 *
 * @returns the tree, in the order the paths were given
 */
export const unflattenTree = (translations: FlatTranslations): TranslationTree =>
	unflatten(translations, { delimiter: keySeparator, object: true })

/**
 * removes groups that hold no translation, at any depth
 *
 * @param tree - tree to prune
 * @param options - options
 *
 * @returns a new tree without empty groups
 */
export const pruneTree = (tree: TranslationTree, { keepTopLevel = false }: PruneOptions = {}): TranslationTree =>
	Object.fromEntries(
		Object.entries(tree).flatMap(([segment, node]): [string, TranslationNode][] => {
			if (typeof node === 'string') return [[segment, node]]
			const pruned = pruneTree(node)
			return keepTopLevel || Object.keys(pruned).length > 0 ? [[segment, pruned]] : []
		})
	)

const collator = new Intl.Collator(keyCollation.locale, keyCollation.options)

/**
 * orders two key segments the way `format` does
 *
 * @note segments the collator calls equal (`step01`, `step1`) fall back to code-unit order, so the
 * order is total and never depends on the input order
 *
 * @param a - first segment
 * @param b - second segment
 *
 * @returns a negative number, zero or a positive number, as `Array.prototype.sort` expects
 */
export const compareSegments = (a: string, b: string): number => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)

/**
 * sorts a tree's keys at every depth, with {@link compareSegments}
 *
 * @note JavaScript always lists integer-like keys (`2`, `10`) first, in numeric order — no sort can
 * change that
 *
 * @param tree - tree to sort
 *
 * @returns a new, sorted tree
 */
export const sortTree = (tree: TranslationTree): TranslationTree =>
	Object.fromEntries(
		Object.entries(tree)
			.sort(([a], [b]) => compareSegments(a, b))
			.map(([segment, node]) => [segment, typeof node === 'string' ? node : sortTree(node)])
	)
