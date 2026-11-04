import { describe, expect, it } from 'vitest'
import { openProject, refusal, threeLocales } from '../../../setup/caller'

const multiFile = {
	'linguify.config.json': { locales: ['en', 'ckb'], options: { fileStructure: 'multi-file' } },
	'locales/en/common.json': { save: 'Save' },
	'locales/en/home.json': { title: 'Home' },
	'locales/ckb/common.json': { save: 'پاشەکەوتکردن' }
}

describe('namespace add', () => {
	it('adds an empty namespace at the end of every locale', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.namespace.add({ name: 'account' })
		expect(result.report.changes).toEqual([{ kind: 'added', path: 'account', locales: ['en', 'ckb', 'de'] }])
		expect(Object.keys((await project.json('locales/en.json')) as object)).toEqual(['common', 'home', 'account'])
		expect(await project.json('locales/de.json')).toEqual({ account: {} })
	})

	it('adds a file per locale in a folder per locale, and nothing else', async () => {
		const project = await openProject(multiFile)
		await project.api.namespace.add({ name: 'account' })
		expect(await project.list('locales/en')).toEqual(['account.json', 'common.json', 'home.json'])
		expect(await project.text('locales/ckb/account.json')).toBe('{}\n')
	})

	it('warns about a namespace there already, even in one locale, and changes nothing', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.namespace.add({ name: 'home' })
		expect(result.report.warnings.map(warning => warning.code)).toEqual(['NAMESPACE_EXISTS'])
		expect(result.plan).toEqual({ write: [], delete: [] })
	})

	it('refuses a name with a dot, one a file cannot take, and any in a project without namespaces', async () => {
		const project = await openProject(threeLocales)
		expect((await refusal(project.api.namespace.add({ name: 'a.b' }))).code).toBe('INVALID_INPUT')
		const files = await openProject(multiFile)
		expect((await refusal(files.api.namespace.add({ name: 'CON' }))).code).toBe('INVALID_INPUT')
		expect((await refusal(files.api.namespace.add({ name: 'Common' }))).code).toBe('INVALID_INPUT')
		const flat = await openProject({
			'linguify.config.json': { options: { namespaces: false } },
			'locales/en.json': {}
		})
		expect((await refusal(flat.api.namespace.add({ name: 'account' }))).code).toBe('NAMESPACES_DISABLED')
	})
})

describe('namespace rename', () => {
	it('renames in place in every locale holding it, its keys and descriptions moving with it', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.namespace.rename({ from: 'common', to: 'shared' })
		expect(result.report.changes).toEqual([
			{ kind: 'renamed', path: 'shared', from: 'common', locales: ['en', 'ckb'], description: true }
		])
		expect(Object.keys((await project.json('locales/en.json')) as object)).toEqual(['shared', 'home'])
		expect(await project.json('locales/_desc.json')).toEqual({ 'shared.save': 'The main button' })
	})

	it('writes the new file and deletes the old one in a folder per locale', async () => {
		const project = await openProject(multiFile)
		const result = await project.api.namespace.rename({ from: 'common', to: 'shared' })
		expect(result.plan.delete.map(file => file.replace(project.cwd, ''))).toEqual([
			'/locales/en/common.json',
			'/locales/ckb/common.json'
		])
		expect(await project.list('locales/en')).toEqual(['home.json', 'shared.json'])
		expect(await project.json('locales/ckb/shared.json')).toEqual({ save: 'پاشەکەوتکردن' })
	})

	it('refuses a name taken, one not there, and the same name', async () => {
		const project = await openProject(threeLocales)
		expect((await refusal(project.api.namespace.rename({ from: 'common', to: 'home' }))).code).toBe('NAMESPACE_EXISTS')
		expect((await refusal(project.api.namespace.rename({ from: 'nope', to: 'x' }))).code).toBe('NAMESPACE_NOT_FOUND')
		expect((await refusal(project.api.namespace.rename({ from: 'common', to: 'common' }))).code).toBe('INVALID_INPUT')
	})
})

describe('namespace remove', () => {
	it('removes it with its keys and their descriptions from every locale', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.namespace.remove({ name: 'common' })
		expect(result.report.changes).toEqual([
			{ kind: 'removed', path: 'common', locales: ['en', 'ckb'], description: true }
		])
		expect(await project.json('locales/en.json')).toEqual({ home: { title: 'Home' } })
		expect(await project.json('locales/_desc.json')).toEqual({})
	})

	it('deletes its files in a folder per locale', async () => {
		const project = await openProject(multiFile)
		await project.api.namespace.remove({ name: 'common' })
		expect([await project.list('locales/en'), await project.list('locales/ckb')]).toEqual([['home.json'], []])
	})

	it('refuses a namespace not there', async () => {
		const project = await openProject(threeLocales)
		expect((await refusal(project.api.namespace.remove({ name: 'nope' }))).code).toBe('NAMESPACE_NOT_FOUND')
	})
})
