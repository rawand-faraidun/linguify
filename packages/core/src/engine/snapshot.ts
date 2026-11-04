import { errorCodes, fileErrorCodes } from '@linguify/constants'
import { EngineError } from '../errors'
import { readTextFile } from '../utils'
import type { FileSnapshot } from './types'

/**
 * the reason given for each way something at a file's path cannot be read
 */
const unreadable: Record<string, string> = {
	[fileErrorCodes.isADirectory]: 'is a folder, not a file',
	[fileErrorCodes.accessDenied]: 'cannot be read: permission denied',
	[fileErrorCodes.notPermitted]: 'cannot be read: permission denied'
}

/**
 * reads one file a catalogue is made of
 *
 * @param path - the file's absolute path
 *
 * @returns its snapshot — `content` is `null` when the file does not exist
 *
 * @throws {@link EngineError} `FILE_INVALID` when something is there but cannot be read — a folder, or a
 * file without read permission — naming the path, which Node's own error for a folder leaves out
 */
export const readSnapshot = async (path: string): Promise<FileSnapshot> => {
	try {
		return { path, content: await readTextFile(path) }
	} catch (error) {
		const reason = unreadable[(error as NodeJS.ErrnoException).code ?? '']
		if (reason === undefined) throw error
		throw new EngineError(`${path} ${reason}`, { code: errorCodes.fileInvalid, details: { file: path }, cause: error })
	}
}
