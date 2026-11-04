import { readFile } from 'node:fs/promises'
import { errorCodes, fileErrorCodes } from '@linguify/constants'
import type { IoFormat, Revision } from '@linguify/types'
import { computeContentRevision } from '../engine'
import { ConflictError } from '../errors'
import { decodeTable, importInvalid } from './decode'
import type { Table } from './table'

/**
 * reads an import file into a table
 *
 * @param path - the file's absolute path
 * @param format - its format
 * @param shownAs - the path as the person gave it, for messages; the absolute path when left out
 *
 * @returns the header and the rows, and the revision of the file's bytes
 *
 * @throws {@link ValidationError} `IMPORT_INVALID` when the file does not exist, is a folder, or is not
 * valid in the format
 */
export const readTable = async (
	path: string,
	format: IoFormat,
	shownAs: string = path
): Promise<Table & { revision: Revision }> => {
	let content: Uint8Array
	try {
		content = await readFile(path)
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code
		if (code === fileErrorCodes.notFound)
			throw importInvalid(shownAs, 'does not exist — export one first, or name another file')
		if (code === fileErrorCodes.isADirectory) throw importInvalid(shownAs, 'is a folder, not a file')
		throw error
	}
	return { ...(await decodeTable(format, content, shownAs)), revision: computeContentRevision(content) }
}

/**
 * @param shownAs - the table's path as the person gave it
 * @param expected - the revision its dry run read
 * @param actual - the revision read now
 *
 * @returns the error for a table that changed between an import's dry run and its run
 */
export const staleTable = (shownAs: string, expected: Revision, actual: Revision): ConflictError =>
	new ConflictError(`${shownAs} changed after it was read. Read it again, then import`, {
		code: errorCodes.staleCatalogue,
		details: { expected, actual }
	})
