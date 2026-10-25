import { rowKinds } from '@linguify/constants'
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
 * section holds
 *
 * @note with these, `getRowModel().rows` is exactly one entry per row on screen — a collapsed section's
 * keys are not in it, an expanded one's follow it
 */
export const rowOptions = {
	getRowId: (row: TableRow): string => row.id,
	getSubRows: (row: TableRow): TableRow[] | undefined => (row.kind === rowKinds.section ? row.subRows : undefined)
}
