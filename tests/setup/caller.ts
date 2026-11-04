import { createCaller, toApiError } from '@linguify/api'
import { makeProject } from './project'

/**
 * a project of the test's own, and the API's caller on it — the path every surface takes to core
 *
 * @param files - the project's files, as {@link makeProject} takes them
 *
 * @returns the project's readers, and its caller
 */
export const openProject = async (files: Readonly<Record<string, unknown>>) => {
	const project = await makeProject(files)
	return { ...project, api: createCaller({ cwd: project.cwd }) }
}

/**
 * @param call - a call that should be refused
 *
 * @returns linguify's code for the refusal, and its message — as every surface shows it, an input the contract
 * refuses included
 */
export const refusal = async (call: Promise<unknown>) => {
	try {
		await call
	} catch (error) {
		const { code, message } = toApiError(error)
		return { code, message }
	}
	throw new Error('the call was not refused')
}

/**
 * a project in English, Kurdish Sorani and German, each locale short of something: ckb has an empty text,
 * lacks `home.title` and has a key the default lacks; de has no file yet
 */
export const threeLocales = {
	'linguify.config.json': { locales: ['en', 'ckb', 'de'], description: true },
	'locales/en.json': { common: { save: 'Save', cancel: 'Cancel' }, home: { title: 'Home' } },
	'locales/ckb.json': { common: { save: 'پاشەکەوتکردن', cancel: '' }, extra: { only: 'تەنها' } },
	'locales/_desc.json': { 'common.save': 'The main button' }
} as const
