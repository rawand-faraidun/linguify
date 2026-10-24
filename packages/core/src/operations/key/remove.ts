import { changeKinds, warningCodes } from '@linguify/constants'
import { joinKeyPath, readNode, removeNodes, splitKeyPath } from '@linguify/keys'
import type { Catalogue, KeyPath, Locale, TranslationTree } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireKeyPath } from '../guards'
import type { KeyChange, OperationResult, Warning } from '../report'
import { invalid } from './shared'

/**
 * `key remove`'s input; a path that does not exist is a warning, not a failure
 */
export type RemoveKeysInput = {
	paths: KeyPath[]
}

/**
 * removes keys from every locale, with their descriptions
 *
 * @note a group goes with everything nested in it. The groups a removal empties are dropped — never a
 * namespace, which `namespace remove` handles. A path no locale has is a warning, and the rest still
 * go; a path given twice is removed once
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `key remove`'s input
 *
 * @returns the catalogue without the keys, and the report
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for no paths or an unusable one — checked before
 * anything is removed
 */
export const removeKeys = (
	context: OperationContext,
	catalogue: Catalogue,
	{ paths }: RemoveKeysInput
): OperationResult => {
	if (paths.length === 0) throw invalid('Nothing to remove: give at least one key path')
	for (const path of paths) requireKeyPath(context, path)

	const unique = [...new Set(paths)]
	const { locales, changes, warnings } = overlapping(unique)
		? removeOneByOne(context, catalogue.locales, unique)
		: removeAtOnce(context, catalogue.locales, unique)

	const removed = new Set(changes.map(({ path }) => path))
	const described = new Set<KeyPath>()
	const kept = Object.entries(catalogue.descriptions).filter(([key]) => {
		const by = findRemovedAncestor(key, removed)
		if (by !== undefined) described.add(by)
		return by === undefined
	})
	const descriptions = described.size === 0 ? catalogue.descriptions : Object.fromEntries(kept)
	return {
		catalogue: { locales, descriptions },
		report: {
			changes: changes.map(change => (described.has(change.path) ? { ...change, description: true as const } : change)),
			warnings
		}
	}
}

/**
 * finds which removed path a key falls under
 *
 * @note one pass over the descriptions for every path at once — checking each path against every
 * description made removing a thousand keys take seconds
 *
 * @param key - a described key path
 * @param removed - the paths removed
 *
 * @returns the removed path that is the key itself or holds it, or `undefined`
 */
const findRemovedAncestor = (key: KeyPath, removed: ReadonlySet<KeyPath>): KeyPath | undefined => {
	const segments = splitKeyPath(key)
	for (let length = segments.length; length > 0; length--) {
		const path = joinKeyPath(segments.slice(0, length))
		if (removed.has(path)) return path
	}
	return undefined
}

/**
 * what removing the paths did to the trees
 */
type Removal = {
	locales: Record<Locale, TranslationTree>
	changes: KeyChange[]
	warnings: Warning[]
}

/**
 * @param path - a key path that no locale has
 *
 * @returns the warning that it was skipped
 */
const skipped = (path: KeyPath): Warning => ({
	code: warningCodes.keyNotFound,
	path,
	message: `\`${path}\` does not exist in any locale; skipped`
})

/**
 * removes paths none of which lies inside another, in one walk of each locale's tree
 *
 * @param context - the operation context
 * @param trees - every locale's tree
 * @param paths - the paths, each once
 *
 * @returns the trees without them, a change per path found, a warning per path not found
 */
const removeAtOnce = (
	{ config, namespaced }: OperationContext,
	trees: Record<Locale, TranslationTree>,
	paths: KeyPath[]
): Removal => {
	const changes: KeyChange[] = []
	const warnings: Warning[] = []
	for (const path of paths) {
		const holders = config.locales.filter(locale => readNode(trees[locale] ?? {}, path) !== undefined)
		if (holders.length === 0) warnings.push(skipped(path))
		else changes.push({ kind: changeKinds.removed, path, locales: holders })
	}
	const gone = changes.map(({ path }) => path)
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => [
			locale,
			removeNodes(trees[locale] ?? {}, gone, { keepTopLevel: namespaced })
		])
	)
	return { locales, changes, warnings }
}

/**
 * removes paths one after another, each seeing what the ones before it left — a path inside one
 * already removed is not found, and a group an earlier removal emptied may be gone
 *
 * @param context - the operation context
 * @param trees - every locale's tree
 * @param paths - the paths, each once
 *
 * @returns the trees without them, a change per path found, a warning per path not found
 */
const removeOneByOne = (
	{ config, namespaced }: OperationContext,
	trees: Record<Locale, TranslationTree>,
	paths: KeyPath[]
): Removal => {
	let locales = trees
	const changes: KeyChange[] = []
	const warnings: Warning[] = []
	for (const path of paths) {
		const holders = config.locales.filter(locale => readNode(locales[locale] ?? {}, path) !== undefined)
		if (holders.length === 0) {
			warnings.push(skipped(path))
			continue
		}
		locales = Object.fromEntries(
			config.locales.map((locale): [Locale, TranslationTree] => [
				locale,
				removeNodes(locales[locale] ?? {}, [path], { keepTopLevel: namespaced })
			])
		)
		changes.push({ kind: changeKinds.removed, path, locales: holders })
	}
	return { locales, changes, warnings }
}

/**
 * @param paths - key paths, each once
 *
 * @returns whether one of them lies inside another — `common` and `common.save` — when their order
 * decides the outcome, so they must be removed one by one
 */
const overlapping = (paths: KeyPath[]): boolean => {
	const all = new Set(paths)
	return paths.some(path => {
		const segments = splitKeyPath(path)
		return segments.slice(1).some((_, index) => all.has(joinKeyPath(segments.slice(0, index + 1))))
	})
}
