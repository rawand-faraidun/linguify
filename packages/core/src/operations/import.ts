import { changeKinds, emptyTranslation, errorCodes, ioColumns } from '@linguify/constants'
import { findConflicts, findDuplicate, readTranslation, setTranslation } from '@linguify/keys'
import type { Catalogue, KeyPath, Locale, TranslationTree } from '@linguify/types'
import { ConflictError, type LinguifyError, NotFoundError, ValidationError } from '../errors'
import { importInvalid, type Table } from '../io'
import { getOwn } from '../utils'
import type { OperationContext } from './context'
import { requireKeyPath } from './guards'
import { notAssignable } from './key/shared'
import type { KeyChange, OperationResult } from './report'

/**
 * a table read from an import file
 */
export type ImportSource = {
	table: Table

	/**
	 * the file it came from, for error messages
	 */
	file: string
}

/**
 * one usable row of an import, with its row number
 */
type ImportRow = {
	rowNumber: number
	key: KeyPath
	texts: Map<Locale, string>
	description: string
}

/**
 * updates and adds keys from an imported table — never removes one
 *
 * @note an empty cell means "no change", so a spreadsheet with only some columns, or some cells, filled
 * in cannot wipe a translation. A key no locale has is added to every locale, like `key add`: the
 * locales the row leaves empty get `""`, or the default's text under `keys.fillWithDefault`; its
 * namespace is created if needed, since a row is an explicit request. A locale that lacks an existing
 * key gets it when its cell has text. Nothing changes unless the whole table is usable
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param source - the table, and the file it came from
 *
 * @returns the updated catalogue, and the report: one change per key, in the table's order
 *
 * @throws {@link ValidationError} `IMPORT_INVALID` for no `key` column, a repeated column or key, a row
 * with text but no key, text past the last column with a header (an unquoted separator in csv), or an
 * unusable key path; `DESCRIPTIONS_DISABLED` for descriptions while they
 * are off
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN` for a column that is neither `key`, `description` nor a
 * configured locale
 * @throws {@link ConflictError} `KEY_NOT_ASSIGNABLE` when a row's key cannot take a translation
 */
export const importCatalogue = (
	context: OperationContext,
	catalogue: Catalogue,
	{ table, file }: ImportSource
): OperationResult => {
	const { config } = context
	const rows = readRows(context, table, file)

	let { locales, descriptions } = catalogue
	const changes: KeyChange[] = []
	for (const { rowNumber, key, texts, description } of rows) {
		const current: Catalogue = { locales, descriptions }
		const exists = findDuplicate(current, key).length > 0
		const conflicts = findConflicts(current, key).filter(({ locale }) => !exists || texts.has(locale))
		const [conflict, ...rest] = conflicts
		if (conflict !== undefined) throw atRow(file, rowNumber, notAssignable(key, [conflict, ...rest]))

		const fallback = config.keys.fillWithDefault ? (texts.get(config.default) ?? emptyTranslation) : emptyTranslation
		const changed = config.locales.filter(locale => {
			const text = texts.get(locale) ?? (exists ? undefined : fallback)
			return text !== undefined && (!exists || readTranslation(locales[locale] ?? {}, key) !== text)
		})
		locales = Object.fromEntries(
			config.locales.map((locale): [Locale, TranslationTree] => {
				const tree = locales[locale] ?? {}
				return [locale, changed.includes(locale) ? setTranslation(tree, key, texts.get(locale) ?? fallback) : tree]
			})
		)
		const described = description !== '' && getOwn(descriptions, key) !== description
		if (described) descriptions = { ...descriptions, [key]: description }
		if (changed.length > 0 || described) {
			changes.push({
				kind: exists ? changeKinds.updated : changeKinds.added,
				path: key,
				locales: changed,
				...(described ? { description: true as const } : {})
			})
		}
	}
	return { catalogue: { locales, descriptions }, report: { changes, warnings: [] } }
}

/**
 * checks the table's columns and rows, before anything changes
 *
 * @param context - the operation context
 * @param table - the imported table
 * @param file - its file, for error messages
 *
 * @returns every row with a key, its row number as a spreadsheet shows it (the header is row 1), and its
 * non-empty cells
 */
const readRows = (context: OperationContext, { header, rows }: Table, file: string): ImportRow[] => {
	const { config } = context
	const blank = (column: number) => rows.every(row => (row[column] ?? '') === '')
	const keyColumn = header.indexOf(ioColumns.key)
	if (keyColumn === -1) throw importInvalid(file, `has no \`${ioColumns.key}\` column`)
	for (const [column, name] of header.entries()) {
		if (header.indexOf(name) !== column) throw importInvalid(file, `has the column \`${name}\` twice`)
		if (name === '' && !blank(column))
			throw importInvalid(file, `has text in column ${column + 1}, which has no header`)
		if (name === '' || name === ioColumns.key || config.locales.includes(name)) continue
		if (name === ioColumns.description) {
			if (!config.description.enabled && !blank(column)) {
				throw new ValidationError(`${file} has descriptions, but descriptions are off in this project`, {
					code: errorCodes.descriptionsDisabled,
					details: { file }
				})
			}
			continue
		}
		throw new NotFoundError(
			`${file} has a column \`${name}\`, which is not a configured locale. The config lists ${config.locales.map(code => `\`${code}\``).join(', ')}`,
			{ code: errorCodes.localeUnknown, details: { file, locale: name, locales: config.locales } }
		)
	}
	const descriptionColumn = config.description.enabled ? header.indexOf(ioColumns.description) : -1

	const seen = new Map<KeyPath, number>()
	return rows.flatMap((row, index): ImportRow[] => {
		const rowNumber = index + 2
		if (row.every(cell => cell === '')) return []
		const past = row.findIndex((cell, column) => column >= header.length && cell !== '')
		if (past !== -1) {
			throw importInvalid(
				file,
				`row ${rowNumber} has text in column ${past + 1}, past the last column with a header — in csv, a cell containing the separator must be in quotes`
			)
		}
		const key = row[keyColumn] ?? ''
		if (key === '') throw importInvalid(file, `row ${rowNumber} has text but no key`)
		try {
			requireKeyPath(context, key)
		} catch (error) {
			throw atRow(file, rowNumber, error as LinguifyError)
		}
		const first = seen.get(key)
		if (first !== undefined) throw importInvalid(file, `repeats \`${key}\` on row ${rowNumber}, first on row ${first}`)
		seen.set(key, rowNumber)
		const texts = new Map(
			config.locales.flatMap((locale): [Locale, string][] => {
				const text = row[header.indexOf(locale)] ?? ''
				return header.includes(locale) && text !== '' ? [[locale, text]] : []
			})
		)
		return [{ rowNumber, key, texts, description: descriptionColumn === -1 ? '' : (row[descriptionColumn] ?? '') }]
	})
}

/**
 * @param file - the import file
 * @param rowNumber - the row the problem is on
 * @param error - the problem, as an operation would report it
 *
 * @returns an `IMPORT_INVALID` error naming the file and row, keeping the original as its cause —
 * except a conflict, which keeps its own code
 */
const atRow = (file: string, rowNumber: number, error: LinguifyError): LinguifyError => {
	const message = `${file}, row ${rowNumber}: ${error.message}`
	if (error instanceof ConflictError) {
		return new ConflictError(message, {
			code: error.code,
			details: { ...error.details, file, rowNumber },
			cause: error
		})
	}
	return new ValidationError(message, { code: errorCodes.importInvalid, details: { file, rowNumber }, cause: error })
}
