import { keyPathStates } from '@linguify/constants'
import type {
	Catalogue,
	KeyConflict,
	KeyPath,
	KeyPathInspection,
	Locale,
	NamespaceName,
	TranslationNode,
	TranslationTree
} from '@linguify/types'
import { joinKeyPath, splitKeyPath } from './path'

/**
 * finds what a key path points at in one tree
 *
 * @note only own keys count — `toString` or `constructor` inherited from `Object.prototype` must never
 * read as an existing translation
 *
 * @param tree - one locale's tree
 * @param path - a usable key path
 *
 * @returns the path's state, with the blocking translation's path when it is `blocked`
 */
export const inspectKeyPath = (tree: TranslationTree, path: KeyPath): KeyPathInspection => {
	const segments = splitKeyPath(path)
	let node: TranslationNode = tree

	for (const [index, segment] of segments.entries()) {
		if (typeof node === 'string') return { state: keyPathStates.blocked, at: joinKeyPath(segments.slice(0, index)) }
		const next: TranslationNode | undefined = Object.hasOwn(node, segment) ? node[segment] : undefined
		if (next === undefined) return { state: keyPathStates.free }
		node = next
	}

	return { state: typeof node === 'string' ? keyPathStates.translation : keyPathStates.group }
}

/**
 * finds the locales that already hold a translation at a path
 *
 * @param catalogue - every locale's tree
 * @param path - a usable key path
 *
 * @returns those locales, in config order
 */
export const findDuplicate = (catalogue: Catalogue, path: KeyPath): Locale[] =>
	Object.entries(catalogue.locales)
		.filter(([, tree]) => inspectKeyPath(tree, path).state === keyPathStates.translation)
		.map(([locale]) => locale)

/**
 * finds the locales where a translation cannot be written at a path: nested keys are already there,
 * or the path runs through a translation
 *
 * @note checked in every locale, not only the default — a write reaches every locale, and they can
 * disagree about a path's shape
 *
 * @param catalogue - every locale's tree
 * @param path - a usable key path
 *
 * @returns one conflict per affected locale, in config order
 */
export const findConflicts = (catalogue: Catalogue, path: KeyPath): KeyConflict[] =>
	Object.entries(catalogue.locales).flatMap(([locale, tree]): KeyConflict[] => {
		const inspection = inspectKeyPath(tree, path)
		if (inspection.state === keyPathStates.group) return [{ locale, state: inspection.state, at: path }]
		if (inspection.state === keyPathStates.blocked) return [{ locale, ...inspection }]
		return []
	})

/**
 * whether a namespace is there: any locale's tree has it, empty or not — a namespace just added holds no
 * keys yet
 *
 * @param catalogue - every locale's tree
 * @param namespace - a namespace name
 *
 * @returns whether some locale has it
 */
export const hasNamespace = (catalogue: Catalogue, namespace: NamespaceName): boolean =>
	namespaceHolders(catalogue, namespace).length > 0

/**
 * the locales that have a namespace, empty or not
 *
 * @param catalogue - every locale's tree
 * @param namespace - a namespace name
 * @param locales - the locales to look in, in the order to give them; every locale the catalogue holds
 * when left out
 *
 * @returns those that have it
 */
export const namespaceHolders = (
	catalogue: Catalogue,
	namespace: NamespaceName,
	locales: readonly Locale[] = Object.keys(catalogue.locales)
): Locale[] => locales.filter(locale => Object.hasOwn(catalogue.locales[locale] ?? {}, namespace))

/**
 * the namespaces there are: every locale's top level, empty ones included, in the order the locales and
 * their trees give them
 *
 * @param catalogue - every locale's tree
 *
 * @returns each namespace once
 */
export const namespacesIn = (catalogue: Catalogue): NamespaceName[] => [
	...new Set(Object.values(catalogue.locales).flatMap(tree => Object.keys(tree)))
]
