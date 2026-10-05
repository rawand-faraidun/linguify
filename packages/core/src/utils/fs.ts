import { mkdir, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileEncoding } from '@linguify/constants'
import writeFileAtomic from 'write-file-atomic'

/**
 * writes a file atomically, creating its folders first
 *
 * @note the content goes to a temporary file beside the target, which is then renamed over it — a
 * crash or a full disk mid-write leaves the old file whole, never half-written JSON
 *
 * @param path - file to write
 * @param content - the file's complete new content — text, written as UTF-8, or bytes
 */
export const writeFile = async (path: string, content: string | Uint8Array): Promise<void> => {
	await mkdir(dirname(path), { recursive: true })
	await writeFileAtomic(path, typeof content === 'string' ? content : Buffer.from(content), { encoding: fileEncoding })
}

/**
 * removes a file
 *
 * @note a file that is already gone is not an error — removing it is idempotent
 *
 * @param path - file to remove
 */
export const removeFile = async (path: string): Promise<void> => {
	await rm(path, { force: true })
}
