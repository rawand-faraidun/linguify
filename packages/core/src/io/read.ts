import { readFile } from 'node:fs/promises'
import { fileErrorCodes } from '@linguify/constants'
import type { IoFormat } from '@linguify/types'
import { decodeTable, importInvalid } from './decode'
import type { Table } from './table'

/**
 * reads an import file into a table
 *
 * @param path - the file's absolute path
 * @param format - its format
 *
 * @returns the header and the rows
 *
 * @throws {@link ValidationError} `IMPORT_INVALID` when the file does not exist, is a folder, or is not
 * valid in the format
 */
export const readTable = async (path: string, format: IoFormat): Promise<Table> => {
	let content: Uint8Array
	try {
		content = await readFile(path)
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code
		if (code === fileErrorCodes.notFound) throw importInvalid(path, 'does not exist')
		if (code === fileErrorCodes.isADirectory) throw importInvalid(path, 'is a folder, not a file')
		throw error
	}
	return decodeTable(format, content, path)
}
