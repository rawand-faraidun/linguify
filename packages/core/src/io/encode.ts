import {
	byteOrderMark,
	defaultFileFormat,
	errorCodes,
	ioDelimiters,
	ioFormats,
	ioLineEnding,
	xlsxColumnWidths,
	xlsxMaxCellLength
} from '@linguify/constants'
import type { IoFormat } from '@linguify/types'
import Papa from 'papaparse'
import writeXlsxFile from 'write-excel-file/node'
import { ValidationError } from '../errors'
import { formatJson } from '../utils'
import type { Table } from './table'
import { escapeCharacter, escapeXstring } from './xstring'

/**
 * turns a table into one format's file content
 */
const encoders: Record<IoFormat, (table: Table) => Promise<string | Uint8Array>> = {
	[ioFormats.csv]: async table => delimited(table, ioDelimiters.csv),
	[ioFormats.tsv]: async table => delimited(table, ioDelimiters.tsv),
	[ioFormats.json]: async ({ header, rows }) =>
		formatJson(
			rows.map(row => Object.fromEntries(header.map((column, index) => [column, row[index] ?? '']))),
			defaultFileFormat
		),
	[ioFormats.xlsx]: async table => {
		requireCellsFit(table)
		const { header, rows } = table
		return new Uint8Array(
			await writeXlsxFile(
				[
					header.map(value => ({ value: toXlsxText(value), fontWeight: 'bold' as const })),
					...rows.map(row => row.map(toXlsxText))
				],
				{
					stickyRowsCount: 1,
					columns: header.map((_, index) => ({ width: index === 0 ? xlsxColumnWidths.key : xlsxColumnWidths.text }))
				}
			).toBuffer()
		)
	}
}

/**
 * turns a table into a file's content
 *
 * @note csv and tsv start with a byte-order mark: without one, Excel reads a UTF-8 file in the system's
 * legacy encoding and garbles every non-Latin translation. json is an array of row objects, keyed by
 * column; xlsx has a bold, frozen header row, and escapes what XML cannot hold the way Excel does
 *
 * @param format - the file format
 * @param table - the header and rows
 *
 * @returns text for csv, tsv and json; bytes for xlsx
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for xlsx when a cell is longer than Excel can hold
 */
export const encodeTable = (format: IoFormat, table: Table): Promise<string | Uint8Array> => encoders[format](table)

/**
 * @param table - the header and rows
 * @param delimiter - the cell separator
 *
 * @returns the table as RFC 4180 text — quoted only where a cell needs it, with a byte-order mark
 */
const delimited = ({ header, rows }: Table, delimiter: string): string =>
	`${byteOrderMark}${Papa.unparse({ fields: header, data: rows }, { delimiter, newline: ioLineEnding })}${ioLineEnding}`

/**
 * makes sure every cell fits in an Excel cell
 *
 * @param table - the header and rows
 *
 * @throws {@link ValidationError} `INVALID_INPUT`, naming the key and the column
 */
const requireCellsFit = ({ header, rows }: Table): void => {
	for (const row of rows) {
		const column = row.findIndex(cell => cell.length > xlsxMaxCellLength)
		if (column === -1) continue
		throw new ValidationError(
			`\`${row[0]}\` has ${row[column]?.length} characters in \`${header[column]}\`, but an Excel cell holds at most ${xlsxMaxCellLength} — export it as csv, tsv or json`,
			{ code: errorCodes.invalidInput, details: { key: row[0], column: header[column] } }
		)
	}
}

/**
 * @param text - a cell's text
 *
 * @returns the text as an xlsx cell stores it: escaped as Excel escapes it, and with the first character
 * escaped too when the whole text is a name `Object.prototype` has — `toString`, `constructor`, …
 *
 * @note write-excel-file 4.1.1 indexes its shared strings in a plain object, so such a text finds an
 * inherited function and the cell is written as `function toString() { [native code] }`, a corrupt
 * file. The escaped character is the same text to every reader and no longer collides. A canary in
 * `media/checks/operations-6-7.mts` fails once the library is fixed, so this can go
 */
const toXlsxText = (text: string): string => {
	const escaped = escapeXstring(text)
	return escaped in Object.prototype ? `${escapeCharacter(escaped)}${escaped.slice(1)}` : escaped
}
