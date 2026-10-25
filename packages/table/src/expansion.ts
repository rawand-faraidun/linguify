import { rowKinds } from '@linguify/constants'
import type { ViewMode } from '@linguify/types'
import type { TableRow } from './rows'
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
