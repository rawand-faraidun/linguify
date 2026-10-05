import { errorCodes, fileEncoding, ioDelimiters, ioFormats, regionalCsvDelimiter } from '@linguify/constants'
import type { IoFormat } from '@linguify/types'
import Papa from 'papaparse'
import { readSheet, type SheetData } from 'read-excel-file/node'
import { ValidationError } from '../errors'
import { isPlainObject } from '../utils'
import type { Table } from './table'
import { unescapeXstring } from './xstring'

/**
 * reads one format's file content into a table
 */
const decoders: Record<IoFormat, (content: Uint8Array, file: string) => Promise<Table>> = {
	[ioFormats.csv]: async (content, file) => {
		const csv = text(content, file)
		const [firstLine = ''] = csv.split('\n', 1)
		const delimiter =
			!firstLine.includes(ioDelimiters.csv) && firstLine.includes(regionalCsvDelimiter)
				? regionalCsvDelimiter
				: ioDelimiters.csv
		return delimited(csv, file, delimiter)
	},
	[ioFormats.tsv]: async (content, file) => delimited(text(content, file), file, ioDelimiters.tsv),
	[ioFormats.json]: async (content, file) => {
		let value: unknown
		try {
			value = JSON.parse(text(content, file))
		} catch (error) {
			throw importInvalid(file, `is not valid JSON: ${(error as Error).message}`)
		}
		if (!Array.isArray(value)) throw importInvalid(file, 'must be an array of rows, as `export` writes it')
		const header: string[] = []
		for (const [index, row] of value.entries()) {
			if (!isPlainObject(row)) throw importInvalid(file, `entry ${index + 1} must be an object of column → text`)
			for (const [column, cell] of Object.entries(row)) {
				if (typeof cell !== 'string') throw importInvalid(file, `entry ${index + 1}: \`${column}\` must be text`)
				if (!header.includes(column)) header.push(column)
			}
		}
		return {
			header,
			rows: value.map(row => header.map(column => (Object.hasOwn(row, column) ? (row[column] as string) : '')))
		}
	},
	[ioFormats.xlsx]: async (content, file) => {
		let sheet: SheetData<string>
		try {
			sheet = await readSheet<string>(Buffer.from(content), { trim: false, parseNumber: number => number })
		} catch (error) {
			throw importInvalid(file, `is not a readable xlsx file: ${(error as Error).message}`)
		}
		const [header = [], ...rows] = sheet.map((row, index) =>
			row.map((cell, column) => {
				if (cell === null) return ''
				if (cell instanceof Date) {
					throw importInvalid(file, `row ${index + 1}, column ${column + 1} is a date; format the cell as text`)
				}
				return unescapeXstring(String(cell))
			})
		)
		return { header, rows }
	}
}

/**
 * reads an import file's content into a table
 *
 * @note every text format must be UTF-8 and may start with a byte-order mark. csv is separated by `,`,
 * or by `;` when the header line is — as Excel saves it in many regions. xlsx cells are read untrimmed,
 * numbers as the text the cell stores, Excel's `_xHHHH_` escapes decoded, and a date is refused rather
 * than guessed at; json is an array of row objects
 *
 * @param format - the file's format
 * @param content - the file's bytes
 * @param file - its path, for error messages
 *
 * @returns the header and the rows, every cell text
 *
 * @throws {@link ValidationError} `IMPORT_INVALID` when the content is not UTF-8 text, or not valid in the
 * format
 */
export const decodeTable = (format: IoFormat, content: Uint8Array, file: string): Promise<Table> =>
	decoders[format](content, file)

/**
 * @param content - a delimited file's text
 * @param file - its path, for error messages
 * @param delimiter - the cell separator
 *
 * @returns the table, blank lines kept as empty rows so row numbers match a spreadsheet's — `import`
 * skips them
 */
const delimited = (content: string, file: string, delimiter: string): Table => {
	const { data, errors } = Papa.parse<string[]>(content, { delimiter })
	const [error] = errors
	if (error !== undefined) throw importInvalid(file, `row ${(error.row ?? 0) + 1}: ${error.message}`)
	const [header = [], ...rows] = data
	return { header, rows }
}

/**
 * @param content - bytes
 * @param file - their file, for the error message
 *
 * @returns them as UTF-8 text — `TextDecoder` drops a leading byte-order mark, which Excel and Windows
 * Notepad write
 *
 * @throws {@link ValidationError} `IMPORT_INVALID` when the bytes are not UTF-8 — Excel's plain "CSV"
 * saves in the system's legacy encoding, and reading that as UTF-8 would turn every accented or
 * non-Latin letter into `�`
 */
const text = (content: Uint8Array, file: string): string => {
	try {
		return new TextDecoder(fileEncoding, { fatal: true }).decode(content)
	} catch {
		throw importInvalid(file, 'is not UTF-8 text. In Excel, save it as "CSV UTF-8"; in other editors, choose UTF-8')
	}
}

/**
 * @param file - the import file
 * @param problem - what is wrong with it
 *
 * @returns the error to throw
 */
export const importInvalid = (file: string, problem: string): ValidationError =>
	new ValidationError(`${file} ${problem}`, { code: errorCodes.importInvalid, details: { file } })
