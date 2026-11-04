import { lstat, readlink, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import {
	applyWrite,
	type LinguifyError,
	loadConfig,
	planWrite,
	readCatalogue,
	scaffoldCatalogue,
	serializeCatalogue
} from '@linguify/core'
import type { Catalogue } from '@linguify/types'
import { describe, expect, it } from 'vitest'
import { makeProject, twoLocales } from '../../../setup/project'

/**
 * reads the project, changes its catalogue, and plans writing it back
 */
const change = async (cwd: string, edit: (catalogue: Catalogue) => Catalogue) => {
	const loaded = await loadConfig({ cwd })
	const read = await readCatalogue(loaded)
	const plan = planWrite(read.files, serializeCatalogue(loaded, edit(read.catalogue)))
	const relative = (file: string) => file.replace(`${loaded.localesDirectory}/`, '')
	return {
		loaded,
		read,
		plan,
		planned: { write: plan.write.map(({ file }) => relative(file)), delete: plan.delete.map(relative) },
		apply: () => applyWrite(loaded, plan, read.revision)
	}
}

/**
 * @returns the error's code, or `written`
 */
const outcome = (write: Promise<unknown>) =>
	write.then(
		() => 'written',
		(error: LinguifyError) => error.code
	)

describe('serializeCatalogue', () => {
	it('writes back byte for byte what it read in the configured format', async () => {
		const project = await makeProject(twoLocales)
		const { planned } = await change(project.cwd, catalogue => catalogue)
		expect(planned).toEqual({ write: [], delete: [] })
	})

	it("lays out a file in the config's format, writing é as the character itself", async () => {
		const project = await makeProject({
			'linguify.config.json': { locales: ['en'] },
			'locales/en.json': '{ "common": { "cafe": "caf\\u00e9" } }'
		})
		const { planned, apply } = await change(project.cwd, catalogue => catalogue)
		expect(planned.write).toEqual(['en.json'])
		await apply()
		expect(await project.text('locales/en.json')).toBe('{\n\t"common": {\n\t\t"cafe": "café"\n\t}\n}\n')
	})

	it('creates the file of a locale that has none yet, as {}', async () => {
		const project = await makeProject({ 'linguify.config.json': { locales: ['en', 'ckb'] }, 'locales/en.json': {} })
		const { planned, apply } = await change(project.cwd, catalogue => catalogue)
		expect(planned).toEqual({ write: ['ckb.json'], delete: [] })
		await apply()
		expect(await project.text('locales/ckb.json')).toBe('{}\n')
	})

	it('refuses a namespace a file cannot be named after, in a folder per locale', async () => {
		const project = await makeProject({
			'linguify.config.json': { locales: ['en'], options: { fileStructure: 'multi-file' } },
			'locales/en/common.json': {}
		})
		for (const name of ['../../evil', 'sub/dir', 'Common']) {
			const loaded = await loadConfig({ cwd: project.cwd })
			const read = await readCatalogue(loaded)
			const next = { ...read.catalogue, locales: { en: { ...read.catalogue.locales.en, [name]: { x: 'y' } } } }
			expect(() => serializeCatalogue(loaded, next)).toThrow()
		}
		expect(await project.list('locales/en')).toEqual(['common.json'])
	})
})

describe('scaffoldCatalogue', () => {
	it("gives each locale's empty file, the descriptions file too when they are on", async () => {
		const { cwd } = await makeProject({ 'linguify.config.json': { locales: ['en', 'ckb'], description: true } })
		const loaded = await loadConfig({ cwd })
		expect(scaffoldCatalogue(loaded).map(file => [file.path.replace(`${cwd}/`, ''), file.content])).toEqual([
			['locales/en.json', '{}\n'],
			['locales/ckb.json', '{}\n'],
			['locales/_desc.json', '{}\n']
		])
	})

	it('gives no file for a folder per locale, which starts with no namespace', async () => {
		const { cwd } = await makeProject({ 'linguify.config.json': { options: { fileStructure: 'multi-file' } } })
		expect(scaffoldCatalogue(await loadConfig({ cwd }))).toEqual([])
	})
})

describe('applyWrite', () => {
	it('writes the planned files and gives the new revision, after which nothing is left to write', async () => {
		const project = await makeProject(twoLocales)
		const edit = (catalogue: Catalogue) => ({
			...catalogue,
			locales: { ...catalogue.locales, ckb: { common: { save: 'پاشەکەوتکردن', cancel: 'هەڵوەشاندنەوە' } } }
		})
		const { planned, apply, read } = await change(project.cwd, edit)
		expect(planned).toEqual({ write: ['ckb.json'], delete: [] })
		const revision = await apply()
		expect(revision).not.toBe(read.revision)
		expect(await project.json('locales/ckb.json')).toEqual({
			common: { save: 'پاشەکەوتکردن', cancel: 'هەڵوەشاندنەوە' }
		})
		const again = await change(project.cwd, edit)
		expect([again.read.revision, again.planned]).toEqual([revision, { write: [], delete: [] }])
	})

	it('refuses a write over files changed since they were read — edited, removed or added — keeping the change', async () => {
		for (const handEdit of [
			{ 'locales/en.json': { common: { save: 'Save it' } } },
			{ 'locales/_desc.json': { 'common.save': 'edited by hand' } },
			{ 'locales/extra.json': {} }
		]) {
			const project = await makeProject({
				...twoLocales,
				'linguify.config.json': { locales: ['en', 'ckb', 'extra'], description: true }
			})
			const pending = await change(project.cwd, catalogue => ({
				...catalogue,
				locales: { ...catalogue.locales, ckb: {} }
			}))
			await project.write(handEdit)
			expect(await outcome(pending.apply())).toBe('STALE_CATALOGUE')
			const [path, content] = Object.entries(handEdit)[0] ?? []
			expect(await project.json(path ?? '')).toEqual(content)
			expect(await project.json('locales/ckb.json')).toEqual(twoLocales['locales/ckb.json'])
		}
	})

	it('writes the first of two saves from one revision, refusing the second', async () => {
		const project = await makeProject(twoLocales)
		const first = await change(project.cwd, catalogue => ({
			...catalogue,
			locales: { ...catalogue.locales, ckb: { common: { save: 'یەکەم' } } }
		}))
		const second = await change(project.cwd, catalogue => ({
			...catalogue,
			locales: { ...catalogue.locales, ckb: { common: { save: 'دووەم' } } }
		}))
		expect(await Promise.all([outcome(first.apply()), outcome(second.apply())])).toEqual(['written', 'STALE_CATALOGUE'])
		expect(await project.json('locales/ckb.json')).toEqual({ common: { save: 'یەکەم' } })
	})

	it('returns the revision it was given for an empty plan, so a later write is still checked', async () => {
		const project = await makeProject(twoLocales)
		const nothing = await change(project.cwd, catalogue => catalogue)
		expect(await nothing.apply()).toBe(nothing.read.revision)
		await project.write({ 'locales/en.json': { common: { save: 'Save it' } } })
		const stale = {
			...nothing.plan,
			write: [{ file: join(nothing.loaded.localesDirectory, 'ckb.json'), content: '{}\n' }]
		}
		expect(await outcome(applyWrite(nothing.loaded, stale, nothing.read.revision))).toBe('STALE_CATALOGUE')
	})

	it('refuses to write or delete outside the locales folder, telling ..notes.json from an escape', async () => {
		const project = await makeProject({ ...twoLocales, 'outside.json': { kept: true } })
		const { loaded, read } = await change(project.cwd, catalogue => catalogue)
		const outside = join(loaded.localesDirectory, '..', 'outside.json')
		await expect(
			applyWrite(loaded, { write: [{ file: outside, content: '{}' }], delete: [] }, read.revision)
		).rejects.toThrow('Refusing to write outside the locales folder')
		await expect(applyWrite(loaded, { write: [], delete: [outside] }, read.revision)).rejects.toThrow(
			'Refusing to write outside the locales folder'
		)
		expect(await project.json('outside.json')).toEqual({ kept: true })
		const dotted = join(loaded.localesDirectory, '..notes.json')
		await expect(
			applyWrite(loaded, { write: [{ file: dotted, content: '{}\n' }], delete: [] }, read.revision)
		).resolves.toBeTypeOf('string')
	})

	it('writes through a symlinked locale file, keeping the link', async () => {
		const project = await makeProject({
			'linguify.config.json': { locales: ['en'] },
			'shared/en.json': { common: { save: 'Save' } },
			'locales/': null
		})
		await symlink(join(project.cwd, 'shared/en.json'), join(project.cwd, 'locales/en.json'))
		const { apply } = await change(project.cwd, () => ({
			locales: { en: { common: { save: 'Save it' } } },
			descriptions: {}
		}))
		await apply()
		expect((await lstat(join(project.cwd, 'locales/en.json'))).isSymbolicLink()).toBe(true)
		expect(await readlink(join(project.cwd, 'locales/en.json'))).toBe(join(project.cwd, 'shared/en.json'))
		expect(await project.json('shared/en.json')).toEqual({ common: { save: 'Save it' } })
	})

	it('adds and removes namespace files in a folder per locale, leaving the others untouched', async () => {
		const project = await makeProject({
			'linguify.config.json': { locales: ['en'], options: { fileStructure: 'multi-file' } },
			'locales/en/common.json': '{\n\t"save": "Save"\n}\n',
			'locales/en/home.json': { title: 'Home' }
		})
		const { planned, apply } = await change(project.cwd, () => ({
			locales: { en: { common: { save: 'Save' }, account: { name: 'Name' } } },
			descriptions: {}
		}))
		expect(planned).toEqual({ write: ['en/account.json'], delete: ['en/home.json'] })
		await apply()
		expect(await project.list('locales/en')).toEqual(['account.json', 'common.json'])
	})

	it('writes only the descriptions file when only a description changed', async () => {
		const project = await makeProject(twoLocales)
		const { planned } = await change(project.cwd, catalogue => ({
			...catalogue,
			descriptions: { 'common.save': 'Saves the form' }
		}))
		expect(planned).toEqual({ write: ['_desc.json'], delete: [] })
		const off = await makeProject({ ...twoLocales, 'linguify.config.json': { locales: ['en', 'ckb'] } })
		expect(
			(await change(off.cwd, catalogue => ({ ...catalogue, descriptions: { 'common.save': 'x' } }))).planned
		).toEqual({ write: [], delete: [] })
	})
})
