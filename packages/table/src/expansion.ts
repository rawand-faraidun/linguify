import { rowKinds, viewModes } from '@linguify/constants'
import { joinKeyPath, splitKeyPath, splitNamespace } from '@linguify/keys'
import type { KeyPath, ViewMode } from '@linguify/types'
import type { TableRow } from './rows'
import { rowId } from './rows'
import { canExpand } from './table'

/**
 * which rows are open: a baseline for every row, and the rows a person opened or closed against it
 *
 * @note never a set of the rows on screen — such a set only holds what is visible, so "expand all"
 * could never reach the rows inside a collapsed section. With a baseline, opening everything is one
 * value, and reaches rows no one has seen yet
 */
export type Expansion = {
	/**
	 * whether a row no one has opened or closed is open
	 */
	all: boolean

	/**
	 * the rows opened or closed against the baseline, by row id
	 */
	overrides: Readonly<Record<string, boolean>>
}

/**
 * every row closed — sections and groups shut
 */
export const collapsedExpansion: Expansion = { all: false, overrides: {} }

/**
 * every row open — every section, every group, every compact key
 */
export const expandedExpansion: Expansion = { all: true, overrides: {} }

/**
 * every section and group open, every key closed — where the compact view starts, showing each key's
 * default text and hiding the rest until a key is opened
 *
 * @param rows - the rows the table shows, every level
 *
 * @returns that expansion
 */
export const sectionsExpansion = (rows: readonly TableRow[]): Expansion => {
	const overrides: Record<string, boolean> = {}
	const visit = (level: readonly TableRow[]) => {
		for (const row of level) {
			if (row.kind === rowKinds.key) continue
			overrides[row.id] = true
			visit(row.subRows)
		}
	}
	visit(rows)
	return { all: false, overrides }
}

/**
 * what a search shows, so no match hides in a closed row: every section and group open — and in the
 * compact view every key too, as a match may be in a locale only an open key shows
 *
 * @param expansion - which rows are open
 * @param rows - the rows the table shows, every level
 * @param mode - the view mode
 *
 * @returns that expansion — keys outside the compact view as they were
 */
export const searchExpansion = (expansion: Expansion, rows: readonly TableRow[], mode: ViewMode): Expansion =>
	mode === viewModes.compact
		? expandedExpansion
		: { all: expansion.all, overrides: { ...expansion.overrides, ...sectionsExpansion(rows).overrides } }

/**
 * whether a row is open
 *
 * @param expansion - which rows are open
 * @param id - a row's id
 *
 * @returns its override, else the baseline
 */
export const isExpanded = ({ all, overrides }: Expansion, id: string): boolean => overrides[id] ?? all

/**
 * opens or closes one row
 *
 * @param expansion - which rows are open
 * @param id - a row's id
 * @param open - open it or close it; the opposite of what it is when left out
 *
 * @returns the expansion with that row opened or closed; an override equal to the baseline is dropped
 */
export const toggleExpansion = (expansion: Expansion, id: string, open = !isExpanded(expansion, id)): Expansion => {
	const { [id]: _, ...rest } = expansion.overrides
	return { all: expansion.all, overrides: open === expansion.all ? rest : { ...rest, [id]: open } }
}

/**
 * the expansion as TanStack Table reads it
 *
 * @param expansion - which rows are open
 * @param rows - the rows the table shows, every level
 * @param mode - the view mode, which decides which rows can open ({@link canExpand})
 *
 * @returns `true` for all open with no exceptions, else a record of every open row at every depth —
 * the only way TanStack can hold "all open but these"
 */
export const toExpandedState = (
	expansion: Expansion,
	rows: readonly TableRow[],
	mode: ViewMode
): true | Record<string, boolean> => {
	if (expansion.all && Object.keys(expansion.overrides).length === 0) return true
	const state: Record<string, boolean> = {}
	const visit = (level: readonly TableRow[]) => {
		for (const row of level) {
			if (canExpand(mode, row) && isExpanded(expansion, row.id)) state[row.id] = true
			if (row.kind !== rowKinds.key) visit(row.subRows)
		}
	}
	visit(rows)
	return state
}

/**
 * opens what holds a key — its section, and in the tree view its groups — so a key just added is in sight
 *
 * @param expansion - which rows are open
 * @param path - the key's path
 * @param shape - the view mode, and whether the project has namespaces
 *
 * @returns the expansion with those rows open
 */
export const revealKey = (
	expansion: Expansion,
	path: KeyPath,
	{ mode, namespaced }: { mode: ViewMode; namespaced: boolean }
): Expansion => {
	const segments = splitKeyPath(path)
	const groups =
		mode === viewModes.tree
			? segments
					.slice(namespaced ? 1 : 0, -1)
					.map((_, index) => rowId(rowKinds.group, joinKeyPath(segments.slice(0, index + (namespaced ? 2 : 1)))))
			: []
	const holders = [...(namespaced ? [rowId(rowKinds.section, splitNamespace(path).namespace)] : []), ...groups]
	return holders.reduce((current, id) => toggleExpansion(current, id, true), expansion)
}
