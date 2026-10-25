import { rowKinds, selectionStates } from '@linguify/constants'
import type { KeyPath, Values } from '@linguify/types'
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
 * @param row - a row
 *
 * @returns every key the row is or holds, at any depth
 */
export const keysOf = (row: TableRow): KeyPath[] =>
	row.kind === rowKinds.key ? [row.key] : row.subRows.flatMap(keysOf)

/**
 * @param selection - the keys selected
 * @param row - a row
 *
 * @returns whether all, some or none of its keys are selected
 */
export const selectionState = (selection: Selection, row: TableRow): SelectionState => {
	const keys = keysOf(row)
	const selected = keys.filter(key => selection.has(key)).length
	return selected === 0 ? selectionStates.none : selected === keys.length ? selectionStates.all : selectionStates.some
}

/**
 * @param selection - the keys selected
 * @param row - the row a person ticked or unticked
 *
 * @returns the selection with the row's keys added — or, when all were selected already, removed; a
 * section or group partly selected becomes wholly selected, as a checkbox showing a dash does
 */
export const toggleSelection = (selection: Selection, row: TableRow): Selection => {
	const keys = keysOf(row)
	const next = new Set(selection)
	if (selectionState(selection, row) === selectionStates.all) for (const key of keys) next.delete(key)
	else for (const key of keys) next.add(key)
	return next
}

/**
 * @param selection - the keys selected
 * @param rows - the rows the table shows, every level — after a filter, only those it lets through
 *
 * @returns every shown key selected — or none, when every shown key already was
 */
export const toggleAll = (selection: Selection, rows: readonly TableRow[]): Selection => {
	const keys = rows.flatMap(keysOf)
	const next = new Set(selection)
	if (keys.length > 0 && keys.every(key => selection.has(key))) for (const key of keys) next.delete(key)
	else for (const key of keys) next.add(key)
	return next
}

/**
 * @param selection - the keys selected
 * @param rows - the rows the table shows now, every level
 *
 * @returns the selection without keys that no longer exist — removed, renamed, or read again from disk
 * — so a bulk delete never names a key that is gone
 */
export const keepExisting = (selection: Selection, rows: readonly TableRow[]): Selection => {
	const existing = new Set(rows.flatMap(keysOf))
	const kept = [...selection].filter(key => existing.has(key))
	return kept.length === selection.size ? selection : new Set(kept)
}
