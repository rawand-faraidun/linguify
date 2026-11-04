import { changeKinds, warningCodes } from '@linguify/constants'
import { joinKeyPath, readNode, removeNodes, splitKeyPath } from '@linguify/keys'
import type { Catalogue, KeyChange, KeyPath, Locale, TranslationNode, TranslationTree, Warning } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireKeyPath } from '../guards'
import type { OperationResult } from '../report'
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
 * go; a path given twice is removed once. A path that is a translation in one locale and nested keys in
 * another loses only the translation, with a warning: the nested keys are keys of their own, which the
 * person did not name
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
	const mixed = new Set(warnings.flatMap(({ code, path }) => (code === warningCodes.structureConflict ? [path] : [])))
	const described = new Set<KeyPath>()
	const kept = Object.entries(catalogue.descriptions).filter(([key]) => {
		const by = findRemovedAncestor(key, removed)
		// under a path removed only as a translation, a nested key's description stays with it
		const gone = by !== undefined && (by === key || !mixed.has(by))
		if (gone) described.add(by)
		return !gone
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
 * @param path - a key path some locale has
 * @param texts - the locales where it is a translation
 * @param groups - the locales where it holds nested keys
 *
 * @returns the warning that only its translation was removed
 */
const translationOnly = (path: KeyPath, texts: Locale[], groups: Locale[]): Warning => ({
	code: warningCodes.structureConflict,
	path,
	message: `\`${path}\` is a translation in ${listed(texts)} but holds nested keys in ${listed(groups)}; only the translation was removed`
})

/**
 * @param locales - locale codes
 *
 * @returns them for a message
 */
const listed = (locales: Locale[]): string => locales.map(locale => `\`${locale}\``).join(', ')

/**
 * finds what a path is in each locale
 *
 * @param locales - the configured locales
 * @param trees - every locale's tree
 * @param path - a key path
 *
 * @returns the locales that have it, and of those, the ones where it is a translation and the ones where
 * it holds nested keys
 */
const shapes = (
	locales: readonly Locale[],
	trees: Record<Locale, TranslationTree>,
	path: KeyPath
): { holders: Locale[]; texts: Locale[]; groups: Locale[] } => {
	const nodes = locales.map((locale): [Locale, TranslationNode | undefined] => [
		locale,
		readNode(trees[locale] ?? {}, path)
	])
	return {
		holders: nodes.flatMap(([locale, node]) => (node === undefined ? [] : [locale])),
		texts: nodes.flatMap(([locale, node]) => (typeof node === 'string' ? [locale] : [])),
		groups: nodes.flatMap(([locale, node]) => (typeof node === 'object' ? [locale] : []))
	}
}

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
	// per locale, the paths it loses: a path that is a translation elsewhere stays where it holds keys
	const gone = new Map<Locale, KeyPath[]>(config.locales.map(locale => [locale, []]))
	for (const path of paths) {
		const { holders, texts, groups } = shapes(config.locales, trees, path)
		if (holders.length === 0) {
			warnings.push(skipped(path))
			continue
		}
		const mixed = texts.length > 0 && groups.length > 0
		if (mixed) warnings.push(translationOnly(path, texts, groups))
		for (const locale of mixed ? texts : holders) gone.get(locale)?.push(path)
		changes.push({ kind: changeKinds.removed, path, locales: mixed ? texts : holders })
	}
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => [
			locale,
			removeNodes(trees[locale] ?? {}, gone.get(locale) ?? [], { keepTopLevel: namespaced })
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
		const { holders, texts, groups } = shapes(config.locales, locales, path)
		if (holders.length === 0) {
			warnings.push(skipped(path))
			continue
		}
		const mixed = texts.length > 0 && groups.length > 0
		if (mixed) warnings.push(translationOnly(path, texts, groups))
		const from = mixed ? texts : holders
		const before = locales
		locales = Object.fromEntries(
			config.locales.map((locale): [Locale, TranslationTree] => [
				locale,
				from.includes(locale)
					? removeNodes(before[locale] ?? {}, [path], { keepTopLevel: namespaced })
					: (before[locale] ?? {})
			])
		)
		changes.push({ kind: changeKinds.removed, path, locales: from })
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
