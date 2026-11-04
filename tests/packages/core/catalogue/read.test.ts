import { chmod, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { type LinguifyError, loadConfig, readCatalogue } from '@linguify/core'
import { describe, expect, it } from 'vitest'
import { makeProject, twoLocales } from '../../../setup/project'

/**
 * @returns the project's catalogue as read, or the error's code and message
 */
const reading = async (cwd: string) => {
	try {
		return await readCatalogue(await loadConfig({ cwd }))
	} catch (error) {
		return { code: (error as LinguifyError).code, message: (error as Error).message.replaceAll(cwd, '…') }
	}
}

describe('readCatalogue, one file per locale', () => {
	it('reads each locale and the descriptions, the revision a SHA-256 digest', async () => {
		const { cwd } = await makeProject(twoLocales)
		const read = await readCatalogue(await loadConfig({ cwd }))
		expect(read.catalogue).toEqual({
			locales: {
				en: { common: { save: 'Save', cancel: 'Cancel' }, home: { title: 'Home' } },
				ckb: { common: { save: 'پاشەکەوتکردن', cancel: '' } }
			},
			descriptions: { 'common.save': 'The main button on every form' }
		})
		expect(read.revision).toMatch(/^[0-9a-f]{64}$/)
	})

	it('reads a locale with no file yet, or no locales folder at all, as empty', async () => {
		const { cwd } = await makeProject({ 'linguify.config.json': { locales: ['en', 'ckb'] } })
		expect((await readCatalogue(await loadConfig({ cwd }))).catalogue.locales).toEqual({ en: {}, ckb: {} })
	})

	it('keeps the order of keys in a file, and takes a byte order mark', async () => {
		const { cwd } = await makeProject({
			'linguify.config.json': { locales: ['en'] },
			'locales/en.json': '﻿{"z":{"b":"B","a":"A"},"a":{"x":"X"}}'
		})
		const { en } = (await readCatalogue(await loadConfig({ cwd }))).catalogue.locales
		expect(Object.keys(en ?? {})).toEqual(['z', 'a'])
		expect(Object.keys((en?.z as object) ?? {})).toEqual(['b', 'a'])
	})

	it('takes a text at the top level when namespaces are off', async () => {
		const { cwd } = await makeProject({
			'linguify.config.json': { locales: ['en'], options: { namespaces: false } },
			'locales/en.json': { title: 'Home' }
		})
		expect((await readCatalogue(await loadConfig({ cwd }))).catalogue.locales.en).toEqual({ title: 'Home' })
	})
})

describe('readCatalogue, a folder per locale', () => {
	it('reads one namespace per file, ignoring other files and folders', async () => {
		const { cwd } = await makeProject({
			'linguify.config.json': { locales: ['en', 'ckb'], options: { fileStructure: 'multi-file' } },
			'locales/en/home.json': { title: 'Home' },
			'locales/en/common.json': { save: 'Save' },
			'locales/en/notes.txt': 'not json',
			'locales/en/nested/x.json': { y: 'z' },
			'locales/ckb/common.json': { save: 'پاشەکەوتکردن' }
		})
		expect((await readCatalogue(await loadConfig({ cwd }))).catalogue.locales).toEqual({
			en: { common: { save: 'Save' }, home: { title: 'Home' } },
			ckb: { common: { save: 'پاشەکەوتکردن' } }
		})
	})

	it('reads a namespace file through a symlink', async () => {
		const project = await makeProject({
			'linguify.config.json': { locales: ['en'], options: { fileStructure: 'multi-file' } },
			'shared/common.json': { save: 'Save' },
			'locales/en/': null
		})
		await symlink(join(project.cwd, 'shared/common.json'), join(project.cwd, 'locales/en/common.json'))
		expect((await readCatalogue(await loadConfig({ cwd: project.cwd }))).catalogue.locales.en).toEqual({
			common: { save: 'Save' }
		})
	})
})

describe('readCatalogue, the revision', () => {
	it('is the same for the same files, and changes with any edit — an empty new file, one character, whitespace', async () => {
		const project = await makeProject(twoLocales)
		const revision = async () => (await readCatalogue(await loadConfig({ cwd: project.cwd }))).revision
		const first = await revision()
		expect(await revision()).toBe(first)
		const seen = new Set([first])
		for (const edit of [
			{ 'locales/en.json': '{"common":{"save":"Save!","cancel":"Cancel"},"home":{"title":"Home"}}' },
			{ 'locales/en.json': '{"common":{"save":"Save!","cancel":"Cancel"},"home":{"title":"Home"}} ' },
			{ 'locales/_desc.json': '{}' },
			{ 'linguify.config.json': { locales: ['en', 'ckb'], description: true, sync: { removeUnused: false } } }
		]) {
			await project.write(edit)
			seen.add(await revision())
		}
		expect(seen.size).toBe(5)
	})
})

describe('readCatalogue refusing a file it cannot use', () => {
	it.each<[string, unknown, string, string]>([
		[
			'invalid JSON',
			'{"common": ',
			'FILE_INVALID',
			'…/locales/en.json is not valid JSON: Unexpected end of JSON input'
		],
		[
			'an array',
			{ common: { save: ['Save'] } },
			'INVALID_STRUCTURE',
			'…/locales/en.json: `common.save` is an array; only text and nested groups are allowed'
		],
		[
			'a number',
			{ common: { save: 5 } },
			'INVALID_STRUCTURE',
			'…/locales/en.json: `common.save` is a number; only text and nested groups are allowed'
		],
		[
			'null',
			{ common: { save: null } },
			'INVALID_STRUCTURE',
			'…/locales/en.json: `common.save` is null; only text and nested groups are allowed'
		],
		[
			'a key holding a dot',
			{ common: { 'a.b': 'x' } },
			'INVALID_STRUCTURE',
			'…/locales/en.json: `common.a.b` contains ".", so linguify could not tell it from a nested key'
		],
		['an empty key', { common: { '': 'x' } }, 'INVALID_STRUCTURE', '…/locales/en.json: `common` contains an empty key'],
		[
			'a reserved key',
			'{"common":{"__proto__":{"polluted":"yes"}}}',
			'INVALID_STRUCTURE',
			'…/locales/en.json: `common.__proto__` is a reserved name'
		],
		[
			'a root that is not a group',
			'"text"',
			'INVALID_STRUCTURE',
			'…/locales/en.json: the file must be a group of keys, not a string'
		],
		[
			'a text at the top level of a namespaced file',
			{ title: 'Home' },
			'INVALID_STRUCTURE',
			'…/locales/en.json: `title` is a translation at the top level, but namespaces are on — every top-level key must be a namespace. Turn `options.namespaces` off if the file has none'
		]
	])('%s, saying where', async (_, content, code, message) => {
		const { cwd } = await makeProject({ 'linguify.config.json': { locales: ['en'] }, 'locales/en.json': content })
		expect(await reading(cwd)).toEqual({ code, message })
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})

	it('says when the files are laid out other than the config says, either way', async () => {
		const multi = await makeProject({
			'linguify.config.json': { locales: ['en'] },
			'locales/en/common.json': { save: 'Save' }
		})
		expect(await reading(multi.cwd)).toEqual({
			code: 'INVALID_STRUCTURE',
			message:
				'…/locales/en.json does not exist, but …/locales/en holds namespace files. The files look multi-file: set `options.fileStructure` to `multi-file`'
		})
		const single = await makeProject({
			'linguify.config.json': { locales: ['en'], options: { fileStructure: 'multi-file' } },
			'locales/en.json': {}
		})
		expect(await reading(single.cwd)).toEqual({
			code: 'INVALID_STRUCTURE',
			message:
				'…/locales/en holds no namespace files, but …/locales/en.json exists. The files look single-file: set `options.fileStructure` to `single-file`'
		})
	})

	it.skipIf(process.getuid?.() === 0)('refuses a locale file it may not read', async () => {
		const project = await makeProject(twoLocales)
		await chmod(join(project.cwd, 'locales/en.json'), 0o000)
		try {
			expect(await reading(project.cwd)).toMatchObject({ code: 'FILE_INVALID' })
		} finally {
			await chmod(join(project.cwd, 'locales/en.json'), 0o644)
		}
	})

	it.each<[unknown, string, string]>([
		[
			'{',
			'FILE_INVALID',
			"…/locales/_desc.json is not valid JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)"
		],
		['[]', 'INVALID_STRUCTURE', '…/locales/_desc.json: the file must be a flat map of key paths to text'],
		[
			{ 'common.save': { nested: 'x' } },
			'INVALID_STRUCTURE',
			'…/locales/_desc.json: `common.save` must describe its key with text'
		],
		[
			{ 'common..save': 'x' },
			'INVALID_STRUCTURE',
			'…/locales/_desc.json: `common..save` is not a usable key path (empty-segment)'
		]
	])('refuses the descriptions %j', async (descriptions, code, message) => {
		const { cwd } = await makeProject({ ...twoLocales, 'locales/_desc.json': descriptions })
		expect(await reading(cwd)).toEqual({ code, message })
	})

	it('reads no descriptions while they are off', async () => {
		const { cwd } = await makeProject({ ...twoLocales, 'linguify.config.json': { locales: ['en', 'ckb'] } })
		const read = await readCatalogue(await loadConfig({ cwd }))
		expect(read.catalogue.descriptions).toEqual({})
		expect(read.files.some(file => file.path.endsWith('_desc.json'))).toBe(false)
	})
})
