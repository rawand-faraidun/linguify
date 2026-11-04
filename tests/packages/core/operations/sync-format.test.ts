import { describe, expect, it } from 'vitest'
import { openProject, refusal, threeLocales } from '../../../setup/caller'

describe('sync', () => {
	it("gives every locale the default's keys it lacks, at the end and in the default's order, never sorting", async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.sync({})
		expect(result.report.changes).toEqual([
			{ kind: 'added', path: 'common.save', locales: ['de'] },
			{ kind: 'added', path: 'common.cancel', locales: ['de'] },
			{ kind: 'added', path: 'home.title', locales: ['ckb', 'de'] }
		])
		expect(await project.json('locales/ckb.json')).toEqual({
			common: { save: 'پاشەکەوتکردن', cancel: '' },
			extra: { only: 'تەنها' },
			home: { title: '' }
		})
		expect(Object.keys((await project.json('locales/ckb.json')) as object)).toEqual(['common', 'extra', 'home'])
		expect(await project.json('locales/de.json')).toEqual({ common: { save: '', cancel: '' }, home: { title: '' } })
	})

	it('never writes the default, and leaves nothing to do the second time', async () => {
		const project = await openProject(threeLocales)
		const first = await project.api.sync({})
		expect(first.plan.write.map(file => file.file.replace(project.cwd, ''))).toEqual([
			'/locales/ckb.json',
			'/locales/de.json'
		])
		expect((await project.api.sync({})).plan).toEqual({ write: [], delete: [] })
	})

	it("fills with the default's text under keys.fillWithDefault", async () => {
		const project = await openProject({
			...threeLocales,
			'linguify.config.json': { locales: ['en', 'ckb', 'de'], keys: { fillWithDefault: true } }
		})
		await project.api.sync({})
		expect(await project.json('locales/de.json')).toEqual({
			common: { save: 'Save', cancel: 'Cancel' },
			home: { title: 'Home' }
		})
	})

	it('removes what the default lacks with removeUnused, its descriptions too, or from the config — the input winning', async () => {
		const project = await openProject({
			...threeLocales,
			'locales/_desc.json': { 'common.save': 'The main button', 'extra.only': 'Only in ckb' }
		})
		const result = await project.api.sync({ removeUnused: true })
		expect(result.report.changes.at(-1)).toEqual({
			kind: 'removed',
			path: 'extra.only',
			locales: ['ckb'],
			description: true
		})
		expect(await project.json('locales/ckb.json')).toEqual({
			common: { save: 'پاشەکەوتکردن', cancel: '' },
			home: { title: '' }
		})
		expect(await project.json('locales/_desc.json')).toEqual({ 'common.save': 'The main button' })
		const configured = await openProject({
			...threeLocales,
			'linguify.config.json': { locales: ['en', 'ckb'], sync: { removeUnused: true } }
		})
		await configured.api.sync({ removeUnused: false })
		expect(await configured.json('locales/ckb.json')).toMatchObject({ extra: { only: 'تەنها' } })
	})

	it('leaves a text where the default has a group, and warns', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en', 'ckb'] },
			'locales/en.json': { common: { menu: { file: 'File' } } },
			'locales/ckb.json': { common: { menu: 'مێنیو' } }
		})
		const result = await project.api.sync({})
		expect(result.report.warnings.length).toBe(1)
		expect(await project.json('locales/ckb.json')).toEqual({ common: { menu: 'مێنیو' } })
	})

	it('refuses removeUnused when the default has no text at all, removing nothing', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en', 'ckb'] },
			'locales/en.json': {},
			'locales/ckb.json': { common: { save: 'x' } }
		})
		expect((await refusal(project.api.sync({ removeUnused: true }))).code).toBe('INVALID_INPUT')
		expect(await project.json('locales/ckb.json')).toEqual({ common: { save: 'x' } })
	})
})

describe('format', () => {
	it('sorts every file at every depth, numbers in order, in the configured layout — and then has nothing to do', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en'], description: true },
			'locales/en.json': '{"home":{"item10":"10","item2":"2","B":"b","a":"a"},"common":{"save":"Save"}}',
			'locales/_desc.json': { 'home.item2': 'Two', 'common.save': 'Saves' }
		})
		await project.api.format({})
		expect(await project.text('locales/en.json')).toBe(
			'{\n\t"common": {\n\t\t"save": "Save"\n\t},\n\t"home": {\n\t\t"a": "a",\n\t\t"B": "b",\n\t\t"item2": "2",\n\t\t"item10": "10"\n\t}\n}\n'
		)
		expect(Object.keys((await project.json('locales/_desc.json')) as object)).toEqual(['common.save', 'home.item2'])
		expect((await project.api.format({ dryRun: true })).plan).toEqual({ write: [], delete: [] })
	})

	it('creates no file for a locale that has none, and changes no key', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en', 'ckb'] },
			'locales/en.json': '{"b":{"x":"x"},"a":{"y":"y"}}'
		})
		const result = await project.api.format({})
		expect(result.report).toEqual({ changes: [], warnings: [] })
		expect(await project.list('locales')).toEqual(['en.json'])
	})

	it('takes a formatted file checked out with Windows line endings as formatted', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en'] },
			'locales/en.json': '{\r\n\t"common": {\r\n\t\t"save": "Save"\r\n\t}\r\n}\r\n'
		})
		expect((await project.api.format({ dryRun: true })).plan).toEqual({ write: [], delete: [] })
	})

	it('lays out in the configured indentation, without the final newline when told', async () => {
		const project = await openProject({
			'linguify.config.json': {
				locales: ['en'],
				options: { indentation: 4, indentationStyle: 'space', finalNewline: false }
			},
			'locales/en.json': '{\n\t"common": {\n\t\t"save": "Save"\n\t}\n}\n'
		})
		await project.api.format({})
		expect(await project.text('locales/en.json')).toBe('{\n    "common": {\n        "save": "Save"\n    }\n}')
	})
})
