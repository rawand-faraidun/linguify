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
 * @param mode - the view mode
 *
 * @returns the row options for it — in compact view a key row expands too, to show the locales the
 * view hides inside the row itself, so it still adds no row of its own
 */
export const rowOptionsFor = (mode: ViewMode) =>
	mode === viewModes.compact
		? {
				...rowOptions,
				getRowCanExpand: (row: { original: TableRow; subRows: unknown[] }) =>
					row.original.kind === rowKinds.key || row.subRows.length > 0
			}
		: rowOptions
