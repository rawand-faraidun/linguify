import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const made: string[] = []

/**
 * an empty folder of the test's own, removed once the test ends
 *
 * @returns its absolute path, with any symlink in the system's temporary folder resolved
 */
export const makeFolder = async (): Promise<string> => {
	const folder = await realpath(await mkdtemp(join(tmpdir(), 'linguify-test-')))
	made.push(folder)
	return folder
}

/**
 * removes every folder the test made
 */
export const removeFolders = async (): Promise<void> => {
	await Promise.all(made.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
}
