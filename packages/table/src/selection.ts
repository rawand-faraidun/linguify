import { rowKinds, selectionStates } from '@linguify/constants'
import type { KeyPath, KeyRow, Values } from '@linguify/types'
import type { TableRow } from './rows'

/**
 * the keys selected — by key path, not row id, so a selection outlives a change of view mode and the
 * rows being built again
 */
export type Selection = ReadonlySet<KeyPath>

/**
 * how much of a row is selected — a section or group is `some` while only part of its keys are
 */
export type SelectionState = Values<typeof selectionStates>

/**
 * the keys a row stands for
 *
 * @param row - a row
 *
 * @returns every key the row is or holds, at any depth
 */
export const keysOf = (row: TableRow): KeyPath[] =>
	row.kind === rowKinds.key ? [row.key] : row.subRows.flatMap(keysOf)

/**
 * @param selection - the keys selected
 * @param keys - some keys
 *
 * @returns whether all, some or none of them are selected; none when there are none
 */
const stateOfKeys = (selection: Selection, keys: readonly KeyPath[]): SelectionState => {
	const selected = keys.filter(key => selection.has(key)).length
	return selected === 0 ? selectionStates.none : selected === keys.length ? selectionStates.all : selectionStates.some
}

/**
 * @param selection - the keys selected
 * @param keys - some keys
 *
 * @returns the selection with them added — or, when all were selected already, removed
 */
const toggleKeys = (selection: Selection, keys: readonly KeyPath[]): Selection => {
	const next = new Set(selection)
	if (stateOfKeys(selection, keys) === selectionStates.all) for (const key of keys) next.delete(key)
	else for (const key of keys) next.add(key)
	return next
}

/**
 * how much of a row is selected
 *
 * @param selection - the keys selected
 * @param row - a row
 *
 * @returns whether all, some or none of its keys are selected
 */
export const selectionState = (selection: Selection, row: TableRow): SelectionState =>
	stateOfKeys(selection, keysOf(row))

/**
 * ticks or unticks a row
 *
 * @param selection - the keys selected
 * @param row - the row a person ticked or unticked
 *
 * @returns the selection with the row's keys added — or, when all were selected already, removed; a
 * section or group partly selected becomes wholly selected, as a checkbox showing a dash does
 */
export const toggleSelection = (selection: Selection, row: TableRow): Selection => toggleKeys(selection, keysOf(row))

/**
 * ticks or unticks every row shown
 *
 * @param selection - the keys selected
 * @param rows - the rows the table shows, every level — after a filter, only those it lets through
 *
 * @returns every shown key selected — or none, when every shown key already was
 */
export const toggleAll = (selection: Selection, rows: readonly TableRow[]): Selection =>
	toggleKeys(selection, rows.flatMap(keysOf))

/**
 * drops keys that no longer exist from a selection
 *
 * @param selection - the keys selected
 * @param keys - every key, as read now
 *
 * @returns the selection without keys that no longer exist — removed, renamed, or read again from disk
 * — so a bulk delete never names a key that is gone; the same selection when none went
 */
export const keepExisting = (selection: Selection, keys: readonly KeyRow[]): Selection => {
	const existing = new Set(keys.map(row => row.key))
	const kept = [...selection].filter(key => existing.has(key))
	return kept.length === selection.size ? selection : new Set(kept)
}

/**
 * how much of what is shown is selected — what the table's select-all checkbox shows
 *
 * @param selection - the keys selected
 * @param rows - the rows the table shows, every level
 *
 * @returns all, some or none of the shown keys; none when nothing is shown
 */
export const shownState = (selection: Selection, rows: readonly TableRow[]): SelectionState =>
	stateOfKeys(selection, rows.flatMap(keysOf))

/**
 * what a bulk delete removes: every selected key, the ones a search or filter hides too, in the order the
 * keys come — and how many of them are hidden, which its confirmation says
 *
 * @param selection - the keys selected
 * @param keys - every key
 * @param shown - the keys the view lets through
 *
 * @returns the paths to remove, in order, and how many the view does not show
 */
export const bulkDelete = (
	selection: Selection,
	keys: readonly KeyRow[],
	shown: readonly KeyRow[]
): { paths: KeyPath[]; hidden: number } => {
	const visible = new Set(shown.map(row => row.key))
	const paths = keys.filter(row => selection.has(row.key)).map(row => row.key)
	return { paths, hidden: paths.filter(path => !visible.has(path)).length }
}
