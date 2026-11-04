import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFiles } from './files'
import { makeFolder } from './folders'

/**
 * a project of the test's own: its files written into a fresh folder, removed after the test
 *
 * @param files - each file's path in the project and its content, as {@link writeFiles} takes them
 *
 * @returns the folder, and readers for what is in it now
 */
export const makeProject = async (files: Readonly<Record<string, unknown>>) => {
	const cwd = await makeFolder()
	await writeFiles(cwd, files)
	return {
		cwd,
		/** a file's text, or `null` when it is not there */
		text: (path: string) => readFile(join(cwd, path), 'utf8').catch(() => null),
		/** a file's JSON */
		json: async (path: string): Promise<unknown> => JSON.parse(await readFile(join(cwd, path), 'utf8')),
		/** the names in a folder, sorted */
		list: async (path: string) => (await readdir(join(cwd, path))).sort(),
		/** writes more files, as a hand edit would */
		write: (more: Readonly<Record<string, unknown>>) => writeFiles(cwd, more)
	}
}

/**
 * a small English and Kurdish Sorani project: one file per locale, namespaced, with descriptions
 */
export const twoLocales = {
	'linguify.config.json': { locales: ['en', 'ckb'], description: true },
	'locales/en.json': { common: { save: 'Save', cancel: 'Cancel' }, home: { title: 'Home' } },
	'locales/ckb.json': { common: { save: 'پاشەکەوتکردن', cancel: '' } },
	'locales/_desc.json': { 'common.save': 'The main button on every form' }
} as const
