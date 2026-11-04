import { rowIdSeparator } from '@linguify/constants'
import { movePath } from '@linguify/keys'
import type { KeyPath, NamespaceName } from '@linguify/types'
import type { Expansion } from './expansion'
import type { KeyFilter } from './filter'
import type { Selection } from './selection'

/**
 * a selection after a namespace is renamed: its keys under the new name
 *
 * @param selection - the keys selected
 * @param from - the namespace renamed
 * @param to - its new name
 *
 * @returns the selection, every key in the namespace moved
 */
export const movedSelection = (selection: Selection, from: NamespaceName, to: NamespaceName): Selection =>
	new Set([...selection].map(path => movePath(path, from, to)))

/**
 * key paths — the rows held still by an edit — after a namespace is renamed
 *
 * @param paths - the key paths
 * @param from - the namespace renamed
 * @param to - its new name
 *
 * @returns them in order, each in the namespace moved
 */
export const movedPaths = (paths: readonly KeyPath[], from: NamespaceName, to: NamespaceName): KeyPath[] =>
	paths.map(path => movePath(path, from, to))

/**
 * which rows are open after a namespace is renamed: what a person opened or closed in it stays so
 *
 * @param expansion - which rows are open
 * @param from - the namespace renamed
 * @param to - its new name
 *
 * @returns the expansion, every override on a row in the namespace — its section, groups and keys — moved
 */
export const movedExpansion = (expansion: Expansion, from: NamespaceName, to: NamespaceName): Expansion => ({
	all: expansion.all,
	overrides: Object.fromEntries(
		Object.entries(expansion.overrides).map(([id, open]) => {
			const at = id.indexOf(rowIdSeparator)
			return [`${id.slice(0, at + 1)}${movePath(id.slice(at + 1), from, to)}`, open]
		})
	)
})

/**
 * a filter after a namespace is renamed: still keeping that namespace, under its new name
 *
 * @param filter - what the table is narrowed to
 * @param from - the namespace renamed
 * @param to - its new name
 *
 * @returns the filter, the namespace renamed in it
 */
export const movedFilter = (filter: KeyFilter, from: NamespaceName, to: NamespaceName): KeyFilter => ({
	...filter,
	namespaces: filter.namespaces?.map(namespace => (namespace === from ? to : namespace))
})
