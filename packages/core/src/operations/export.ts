import { emptyTranslation, ioColumns } from '@linguify/constants'
import type { Catalogue, ExportInput } from '@linguify/types'
import { encodeTable, type IoTarget, resolveIoTarget, type Table } from '../io'
import { localeOrder, type OperationContext } from './context'
import { buildKeyRows } from './rows'

/**
 * an export, ready to be written
 */
export type ExportFile = IoTarget & {
	/**
	 * how many keys it holds — one row each
	 */
	rows: number

	/**
	 * the file's complete content: text for csv, tsv and json, bytes for xlsx
	 */
	content: string | Uint8Array
}

/**
 * turns the catalogue into an export file, without writing it
 *
 * @note one row per key in any locale, in the default's order; a locale without the key has an empty
 * cell, which `import` reads as "no change", so an export imports back as nothing to do
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `export`'s input
 *
 * @returns the format, the path relative to the working directory, the row count and the content
 *
 * @throws {@link ValidationError} `INVALID_INPUT` when the format and the path's extension disagree
 */
export const exportCatalogue = async (
	context: OperationContext,
	catalogue: Catalogue,
	input: ExportInput = {}
): Promise<ExportFile> => {
	const target = resolveIoTarget(context.config, input)
	const table = buildTable(context, catalogue)
	return { ...target, rows: table.rows.length, content: await encodeTable(target.format, table) }
}

/**
 * @param context - the operation context
 * @param catalogue - the catalogue
 *
 * @returns the catalogue as a table: `key`, `description` when on, the default locale, the rest
 */
const buildTable = (context: OperationContext, catalogue: Catalogue): Table => {
	const described = context.config.description.enabled
	const locales = localeOrder(context.config)
	return {
		header: [ioColumns.key, ...(described ? [ioColumns.description] : []), ...locales],
		rows: buildKeyRows(context, catalogue).map(row => [
			row.key,
			...(described ? [row.description ?? emptyTranslation] : []),
			...locales.map(locale => row.values[locale] ?? emptyTranslation)
		])
	}
}
