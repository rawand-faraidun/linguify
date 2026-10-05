import { readFile } from 'node:fs/promises'
import { byteOrderMark, fileEncoding, fileErrorCodes } from '@linguify/constants'

/**
 * drops the byte-order mark some editors — Windows Notepad among them — put at the start of a file
 *
 * @param text - the file's text
 *
 * @returns the text without a leading byte-order mark
 */
export const stripByteOrderMark = (text: string): string =>
	text.startsWith(byteOrderMark) ? text.slice(byteOrderMark.length) : text

/**
 * reads a text file that may not exist
 *
 * @param path - file to read
 *
 * @returns its text exactly as stored, or `null` when there is no such file
 */
export const readTextFile = async (path: string): Promise<string | null> => {
	try {
		return await readFile(path, fileEncoding)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === fileErrorCodes.notFound) return null
		throw error
	}
}
