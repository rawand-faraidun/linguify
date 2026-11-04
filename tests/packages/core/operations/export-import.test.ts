import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openProject, refusal } from '../../../setup/caller'

const awkward = {
	'linguify.config.json': { locales: ['en', 'ckb'], description: true },
	'locales/en.json': { common: { save: 'Save, "now"', cancel: 'Cancel\nlater', zero: '007', formula: '=1+1' } },
	'locales/ckb.json': { common: { save: 'پاشەکەوتکردن', cancel: '' } },
	'locales/_desc.json': { 'common.save': 'Main' }
}

describe('export', () => {
	it('writes csv by default to ./translations.csv, for Excel: a byte order mark, \\r\\n, quoting', async () => {
		const project = await openProject(awkward)
		expect(await project.api.export({})).toEqual({
			format: 'csv',
			path: join(project.cwd, 'translations.csv'),
			rows: 4,
			replaces: false,
			written: true
		})
		expect(await project.text('translations.csv')).toBe(
			'﻿key,description,en,ckb\r\ncommon.save,Main,"Save, ""now""",پاشەکەوتکردن\r\ncommon.cancel,,"Cancel\nlater",\r\ncommon.zero,,007,\r\ncommon.formula,,=1+1,\r\n'
		)
	})

	it('takes the format from the extension, making the folder, and refuses one that disagrees', async () => {
		const project = await openProject(awkward)
		expect((await project.api.export({ path: 'out/words.tsv' })).format).toBe('tsv')
		expect(await project.text('out/words.tsv')).toContain('common.save\tMain\t"Save, ""now"""\tپاشەکەوتکردن\r\n')
		expect(await refusal(project.api.export({ path: 'x.csv', format: 'tsv' }))).toEqual({
			code: 'INVALID_INPUT',
			message: '`x.csv` is a csv file, but the format asked for is tsv'
		})
	})

	it('writes json as one object per row, keyed by column', async () => {
		const project = await openProject(awkward)
		await project.api.export({ format: 'json' })
		expect(((await project.json('translations.json')) as unknown[])[0]).toEqual({
			key: 'common.save',
			description: 'Main',
			en: 'Save, "now"',
			ckb: 'پاشەکەوتکردن'
		})
	})

	it("refuses to write over the project's own files", async () => {
		const project = await openProject(awkward)
		expect(await refusal(project.api.export({ path: 'locales/en.json' }))).toEqual({
			code: 'INVALID_INPUT',
			message:
				"Refusing to export to locales/en.json: it is inside the locales folder. Choose a path outside the project's own files"
		})
		expect((await refusal(project.api.export({ path: 'linguify.config.json' }))).code).toBe('INVALID_INPUT')
		expect(await project.json('locales/en.json')).toEqual(awkward['locales/en.json'])
	})

	it('refuses to replace a file that is not an earlier export', async () => {
		const project = await openProject({ ...awkward, 'package.json': { name: 'app' } })
		expect((await refusal(project.api.export({ path: 'package.json' }))).code).toBe('INVALID_INPUT')
		expect(await project.json('package.json')).toEqual({ name: 'app' })
	})
})

describe('import', () => {
	it.each(['csv', 'tsv', 'json', 'xlsx'] as const)('changes nothing after an export to %s', async format => {
		const project = await openProject(awkward)
		await project.api.export({ format })
		const result = await project.api.import({ format })
		expect([result.report, result.plan]).toEqual([
			{ changes: [], warnings: [] },
			{ write: [], delete: [] }
		])
	})

	it('updates and adds keys, an empty cell changing nothing, never removing one', async () => {
		const project = await openProject(awkward)
		await project.write({
			'translations.csv': 'key,description,en,ckb\ncommon.cancel,,,هەڵوەشاندنەوە\ncommon.delete,Removes,Delete,\n'
		})
		const result = await project.api.import({})
		expect(result.report.changes).toEqual([
			{ kind: 'updated', path: 'common.cancel', locales: ['ckb'] },
			{ kind: 'added', path: 'common.delete', locales: ['en', 'ckb'], description: true }
		])
		expect(await project.json('locales/en.json')).toEqual({
			common: { ...awkward['locales/en.json'].common, delete: 'Delete' }
		})
		expect(await project.json('locales/ckb.json')).toEqual({
			common: { save: 'پاشەکەوتکردن', cancel: 'هەڵوەشاندنەوە', delete: '' }
		})
		expect(await project.json('locales/_desc.json')).toEqual({ 'common.save': 'Main', 'common.delete': 'Removes' })
	})

	it("gives a new key's empty cells the default's text under keys.fillWithDefault", async () => {
		const project = await openProject({
			...awkward,
			'linguify.config.json': { locales: ['en', 'ckb'], keys: { fillWithDefault: true } }
		})
		await project.write({ 'translations.csv': 'key,en,ckb\ncommon.delete,Delete,\n' })
		await project.api.import({})
		expect(await project.json('locales/ckb.json')).toMatchObject({ common: { delete: 'Delete' } })
	})

	it('refuses a table it cannot use, naming the file and the row, writing nothing', async () => {
		const project = await openProject(awkward)
		await project.write({
			'unknown.csv': 'key,en,fr\ncommon.save,x,y\n',
			'twice.csv': 'key,en\ncommon.save,x\ncommon.save,y\n'
		})
		expect(await refusal(project.api.import({ path: 'unknown.csv' }))).toEqual({
			code: 'LOCALE_UNKNOWN',
			message: 'unknown.csv has a column `fr`, which is not a configured locale. The config lists `en`, `ckb`'
		})
		expect(await refusal(project.api.import({ path: 'twice.csv' }))).toEqual({
			code: 'IMPORT_INVALID',
			message: 'twice.csv repeats `common.save` on row 3, first on row 2'
		})
		expect(await readFile(join(project.cwd, 'locales/en.json'), 'utf8')).toBe(
			`${JSON.stringify(awkward['locales/en.json'], null, '\t')}\n`
		)
	})
})
