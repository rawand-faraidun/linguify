import { keyCollation, keySeparator } from '@linguify/constants'
import type { FlatTranslations, KeyPath, TranslationNode, TranslationTree } from '@linguify/types'
import { flatten, unflatten } from 'flat'
import { joinKeyPath, splitKeyPath } from './path'

/**
 * {@link removeNode} options
 */
export type RemoveNodeOptions = {
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
 * reads what is at a path
 *
 * @param tree - one locale's tree
 * @param path - a usable key path
 *
 * @returns the translation or the group of nested keys there, or `undefined` when there is nothing —
 * only own keys count
 */
export const readNode = (tree: TranslationTree, path: KeyPath): TranslationNode | undefined => {
	let node: TranslationNode = tree
	for (const segment of splitKeyPath(path)) {
		const next: TranslationNode | undefined =
			typeof node !== 'string' && Object.hasOwn(node, segment) ? node[segment] : undefined
		if (next === undefined) return undefined
		node = next
	}
	return node
}

/**
 * reads the translation at a path
 *
 * @param tree - one locale's tree
 * @param path - a usable key path
 *
 * @returns the text, or `undefined` when the path holds no translation — nothing, or nested keys
 */
export const readTranslation = (tree: TranslationTree, path: KeyPath): string | undefined => {
	const node = readNode(tree, path)
	return typeof node === 'string' ? node : undefined
}

/**
 * puts a translation or a group of nested keys at a path, creating the groups on the way
 *
 * @note order is kept: an existing key changes in place, a new one goes at the bottom of its level —
 * only `format` sorts. Whatever was at the path is replaced; {@link setTranslation} refuses to replace
 * nested keys
 *
 * @param tree - one locale's tree
 * @param path - a usable key path
 * @param node - what to put there
 *
 * @returns a new tree; the input is not changed
 *
 * @throws `TypeError` when the path runs through a translation, which cannot hold nested keys
 */
export const setNode = (tree: TranslationTree, path: KeyPath, node: TranslationNode): TranslationTree => {
	const [segment = '', ...rest] = splitKeyPath(path)
	if (rest.length === 0) return { ...tree, [segment]: node }
	const current = Object.hasOwn(tree, segment) ? tree[segment] : undefined
	if (typeof current === 'string') throw new TypeError(`\`${segment}\` is a translation; it cannot hold nested keys`)
	return { ...tree, [segment]: setNode(current ?? {}, joinKeyPath(rest), node) }
}

/**
 * writes a translation at a path, creating the groups on the way
 *
 * @note order is kept, as with {@link setNode}
 *
 * @param tree - one locale's tree
 * @param path - a usable key path that is free or already a translation; check it with
 * `inspectKeyPath` first
 * @param text - the translation
 *
 * @returns a new tree; the input is not changed
 *
 * @throws `TypeError` when the path holds nested keys or runs through a translation — writing would
 * destroy them
 */
export const setTranslation = (tree: TranslationTree, path: KeyPath, text: string): TranslationTree => {
	if (typeof readNode(tree, path) === 'object')
		throw new TypeError(`\`${path}\` holds nested keys; a translation would replace them`)
	return setNode(tree, path, text)
}

/**
 * removes what is at a path — a translation, or a group with everything in it
 *
 * @note only the groups the removal empties are dropped, never an empty group elsewhere in the tree;
 * order is kept
 *
 * @param tree - one locale's tree
 * @param path - a usable key path
 * @param options - `keepTopLevel` keeps an emptied first-level group, so a namespace survives losing
 * its last key
 *
 * @returns a new tree, or the same tree when nothing is at the path
 */
export const removeNode = (
	tree: TranslationTree,
	path: KeyPath,
	{ keepTopLevel = false }: RemoveNodeOptions = {}
): TranslationTree => {
	const [segment = '', ...rest] = splitKeyPath(path)
	const current = Object.hasOwn(tree, segment) ? tree[segment] : undefined
	if (current === undefined) return tree
	if (rest.length === 0) return omit(tree, segment)
	if (typeof current === 'string') return tree
	const inner = removeNode(current, joinKeyPath(rest))
	if (inner === current) return tree
	if (Object.keys(inner).length === 0 && !keepTopLevel) return omit(tree, segment)
	return { ...tree, [segment]: inner }
}

/**
 * removes what is at many paths at once — the same result as {@link removeNode} for each in turn, in one
 * walk of the tree
 *
 * @note removing path after path copied the parent group once per path; removing thousands of keys
 * from a large locale took seconds. Here each group is copied at most once, and a group nothing is
 * removed from is kept as it is
 *
 * @param tree - one locale's tree
 * @param paths - usable key paths; one that is not in the tree changes nothing
 * @param options - `keepTopLevel` keeps an emptied first-level group, as with {@link removeNode}
 *
 * @returns a new tree, or the same tree when nothing is at any of the paths
 */
export const removeNodes = (
	tree: TranslationTree,
	paths: Iterable<KeyPath>,
	{ keepTopLevel = false }: RemoveNodeOptions = {}
): TranslationTree => {
	const targets: PathTrie = new Map()
	for (const path of paths) {
		let level = targets
		const segments = splitKeyPath(path)
		for (const [index, segment] of segments.entries()) {
			const last = index === segments.length - 1
			const next = level.get(segment)
			if (next === true) break
			if (last) {
				level.set(segment, true)
				break
			}
			const deeper: PathTrie = next ?? new Map()
			level.set(segment, deeper)
			level = deeper
		}
	}
	return removeAll(tree, targets, keepTopLevel)
}

/**
 * the paths to remove, by segment: `true` where a path ends, the next level where it goes on
 */
type PathTrie = Map<string, true | PathTrie>

/**
 * @param tree - a group
 * @param targets - what to remove from it
 * @param keepEmptied - keep a child group the removal empties
 *
 * @returns the group without them, or the same group when nothing was there to remove
 */
const removeAll = (tree: TranslationTree, targets: PathTrie, keepEmptied: boolean): TranslationTree => {
	let changed = false
	const entries: [string, TranslationNode][] = []
	for (const [segment, node] of Object.entries(tree)) {
		const target = targets.get(segment)
		if (target === true) {
			changed = true
			continue
		}
		if (target === undefined || typeof node === 'string') {
			entries.push([segment, node])
			continue
		}
		const inner = removeAll(node, target, false)
		if (inner === node) {
			entries.push([segment, node])
			continue
		}
		changed = true
		if (Object.keys(inner).length > 0 || keepEmptied) entries.push([segment, inner])
	}
	return changed ? Object.fromEntries(entries) : tree
}

/**
 * writes a translation at a path into a tree the caller owns, creating the groups on the way
 *
 * @note mutates `tree` — for a batch of writes to one copy, where {@link setTranslation} would copy the
 * key's whole group again for every write. Order is kept as with {@link setNode}: an existing key stays
 * where it is, a new one goes at the bottom of its level. Written as own properties, so even a reserved
 * segment could never reach an object's prototype
 *
 * @param tree - one locale's tree, owned by the caller — a copy, never a tree read elsewhere
 * @param path - a usable key path that is free or already a translation
 * @param text - the translation
 *
 * @throws `TypeError` when the path holds nested keys or runs through a translation
 */
export const assignTranslation = (tree: TranslationTree, path: KeyPath, text: string): void => {
	const segments = splitKeyPath(path)
	let level = tree
	for (const [index, segment] of segments.entries()) {
		const current = Object.hasOwn(level, segment) ? level[segment] : undefined
		if (index === segments.length - 1) {
			if (typeof current === 'object')
				throw new TypeError(`\`${path}\` holds nested keys; a translation would replace them`)
			define(level, segment, text)
			return
		}
		if (typeof current === 'string') throw new TypeError(`\`${segment}\` is a translation; it cannot hold nested keys`)
		const next: TranslationTree = current ?? {}
		if (current === undefined) define(level, segment, next)
		level = next
	}
}

/**
 * @param tree - a group
 * @param segment - a key
 * @param node - its value
 */
const define = (tree: TranslationTree, segment: string, node: TranslationNode): void => {
	Object.defineProperty(tree, segment, { value: node, enumerable: true, writable: true, configurable: true })
}

/**
 * @param tree - a tree
 * @param segment - one of its keys
 *
 * @returns a new tree without that key, in the same order
 */
const omit = (tree: TranslationTree, segment: string): TranslationTree =>
	Object.fromEntries(Object.entries(tree).filter(([key]) => key !== segment))

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
 * orders two key paths the way a sorted tree lists them — segment by segment with
 * {@link compareSegments}, a group's own path before the keys inside it
 *
 * @param a - first key path
 * @param b - second key path
 *
 * @returns a negative number, zero or a positive number, as `Array.prototype.sort` expects
 */
export const compareKeyPaths = (a: KeyPath, b: KeyPath): number => {
	const [left, right] = [splitKeyPath(a), splitKeyPath(b)]
	for (let index = 0; index < Math.min(left.length, right.length); index++) {
		const order = compareSegments(left[index] ?? '', right[index] ?? '')
		if (order !== 0) return order
	}
	return left.length - right.length
}

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
