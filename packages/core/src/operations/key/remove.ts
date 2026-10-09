import { changeKinds, warningCodes } from '@linguify/constants'
import { joinKeyPath, readNode, removeNode, splitKeyPath } from '@linguify/keys'
import type { Catalogue, KeyPath, TranslationTree } from '@linguify/types'
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
	const { config } = context
	if (paths.length === 0) throw invalid('Nothing to remove: give at least one key path')
	for (const path of paths) requireKeyPath(context, path)

	let { locales } = catalogue
	const changes: KeyChange[] = []
	const warnings: Warning[] = []
	for (const path of new Set(paths)) {
		const holders = config.locales.filter(locale => readNode(locales[locale] ?? {}, path) !== undefined)
		if (holders.length === 0) {
			warnings.push({
				code: warningCodes.keyNotFound,
				path,
				message: `\`${path}\` does not exist in any locale; skipped`
			})
			continue
		}
		locales = Object.fromEntries(
			config.locales.map((locale): [string, TranslationTree] => [
				locale,
				removeNode(locales[locale] ?? {}, path, { keepTopLevel: context.namespaced })
			])
		)
		changes.push({ kind: changeKinds.removed, path, locales: holders })
	}

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
