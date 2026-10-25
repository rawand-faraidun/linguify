import { rowKinds, viewModes } from '@linguify/constants'
import type { ViewMode } from '@linguify/types'
import { createExpandedRowModel, rowExpandingFeature } from '@tanstack/table-core'
import type { TableRow } from './rows'

/**
 * the TanStack Table features every surface's table needs, on top of its own reactivity: sections and
 * groups expand and collapse
 *
 * @example
 * useTable({ features: tableFeatures({ ...rowFeatures }), ...rowOptions, data, columns })
 */
export const rowFeatures = {
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel()
}

/**
 * how TanStack Table reads the rows `@linguify/table` builds: each row's stable id, and the rows a
 * section or group holds
 *
 * @note with these, `getRowModel().rows` is exactly one entry per row on screen — a collapsed section's
 * keys are not in it, an expanded one's follow it
 */
export const rowOptions = {
	getRowId: (row: TableRow): string => row.id,
	getSubRows: (row: TableRow): TableRow[] | undefined => (row.kind === rowKinds.key ? undefined : row.subRows)
}

/**
 * whether a row can open in a view mode: a section or a group always; a key only in compact view, where
 * opening it shows the locales the view hides — inside the row itself, so it adds no row of its own
 *
 * @param mode - the view mode
 * @param row - a row
 *
 * @returns whether it can open
 */
export const canExpand = (mode: ViewMode, row: TableRow): boolean =>
	row.kind !== rowKinds.key || mode === viewModes.compact

/**
 * the row options for a view mode — {@link rowOptions}, and in every mode the one rule of
 * {@link canExpand}
 *
 * @param mode - the view mode
 *
 * @returns the options to hand to TanStack Table
 */
export const rowOptionsFor = (mode: ViewMode) => ({
	...rowOptions,
	getRowCanExpand: (row: { original: TableRow }) => canExpand(mode, row.original)
})
