import { describe, expect, it } from 'vitest'
import { openProject, refusal, threeLocales } from '../../../setup/caller'

describe('key add', () => {
	it('adds the key at the end of its namespace in every locale, its description too', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.add({
			path: 'common.delete',
			value: 'Delete',
			translations: { ckb: 'سڕینەوە' },
			description: 'Removes it'
		})
		expect(result.report).toEqual({
			changes: [{ kind: 'added', path: 'common.delete', locales: ['en', 'ckb', 'de'], description: true }],
			warnings: []
		})
		expect(await project.json('locales/en.json')).toEqual({
			common: { save: 'Save', cancel: 'Cancel', delete: 'Delete' },
			home: { title: 'Home' }
		})
		expect(Object.keys(((await project.json('locales/ckb.json')) as { common: object }).common)).toEqual([
			'save',
			'cancel',
			'delete'
		])
		expect(await project.json('locales/de.json')).toEqual({ common: { delete: '' } })
		expect(await project.json('locales/_desc.json')).toEqual({
			'common.save': 'The main button',
			'common.delete': 'Removes it'
		})
	})

	it("gives a locale left out the default's text under keys.fillWithDefault", async () => {
		const project = await openProject({
			...threeLocales,
			'linguify.config.json': { locales: ['en', 'ckb', 'de'], keys: { fillWithDefault: true } }
		})
		await project.api.key.add({ path: 'common.delete', value: 'Delete' })
		expect(await project.json('locales/de.json')).toEqual({ common: { delete: 'Delete' } })
	})

	it('warns about a key already there and changes nothing', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.add({ path: 'common.save', value: 'x' })
		expect(result.report.warnings).toEqual([
			{
				code: 'KEY_EXISTS',
				path: 'common.save',
				message: '`common.save` already exists in `en`, `ckb`; nothing changed'
			}
		])
		expect(result.plan).toEqual({ write: [], delete: [] })
	})

	it('refuses a path through a text, and a namespace not there unless asked to create it', async () => {
		const project = await openProject(threeLocales)
		expect(await refusal(project.api.key.add({ path: 'common.save.label' }))).toEqual({
			code: 'KEY_NOT_ASSIGNABLE',
			message: '`common.save.label` runs through `common.save`, a translation in `en`, which cannot hold nested keys'
		})
		expect(await refusal(project.api.key.add({ path: 'account.name' }))).toEqual({
			code: 'NAMESPACE_NOT_FOUND',
			message:
				'The namespace `account` does not exist. Create it first, or allow `key add` to create it (`keys.createNamespace`)'
		})
		await project.api.key.add({ path: 'account.name', value: 'Name', createNamespace: true })
		expect(await project.json('locales/en.json')).toMatchObject({ account: { name: 'Name' } })
	})

	it('refuses an unusable path, an unknown locale and a description while they are off', async () => {
		const project = await openProject(threeLocales)
		expect(await refusal(project.api.key.add({ path: 'common..x' }))).toEqual({
			code: 'INVALID_INPUT',
			message:
				'Invalid input:\n  path: Not a usable key path. A segment is empty: two dots together, or one at either end.'
		})
		expect((await refusal(project.api.key.add({ path: 'common.x', translations: { fr: 'x' } }))).code).toBe(
			'LOCALE_UNKNOWN'
		)
		const off = await openProject({ ...threeLocales, 'linguify.config.json': { locales: ['en', 'ckb'] } })
		expect((await refusal(off.api.key.add({ path: 'common.x', description: 'x' }))).code).toBe('DESCRIPTIONS_DISABLED')
	})

	it('writes nothing on a dry run', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.add({ path: 'common.delete', dryRun: true })
		expect(result.applied).toBe(false)
		expect(await project.json('locales/en.json')).toEqual(threeLocales['locales/en.json'])
	})
})

describe('key set', () => {
	it("sets a locale's text, filling a gap without creating the key elsewhere", async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.set({
			path: 'common.cancel',
			translations: { ckb: 'هەڵوەشاندنەوە', de: 'Abbrechen' }
		})
		expect(result.report.changes).toEqual([{ kind: 'updated', path: 'common.cancel', locales: ['ckb', 'de'] }])
		expect(await project.json('locales/ckb.json')).toEqual({
			common: { save: 'پاشەکەوتکردن', cancel: 'هەڵوەشاندنەوە' },
			extra: { only: 'تەنها' }
		})
		expect(await project.json('locales/de.json')).toEqual({ common: { cancel: 'Abbrechen' } })
	})

	it('gives every locale the text with all, except one given its own', async () => {
		const project = await openProject(threeLocales)
		await project.api.key.set({ path: 'home.title', value: 'Start', all: true, translations: { ckb: 'سەرەتا' } })
		expect(await project.json('locales/en.json')).toMatchObject({ home: { title: 'Start' } })
		expect(await project.json('locales/ckb.json')).toMatchObject({ home: { title: 'سەرەتا' } })
		expect(await project.json('locales/de.json')).toEqual({ home: { title: 'Start' } })
	})

	it('sets, and with "" removes, a description', async () => {
		const project = await openProject(threeLocales)
		await project.api.key.set({ path: 'common.cancel', description: 'Closes without saving' })
		await project.api.key.set({ path: 'common.save', description: '' })
		expect(await project.json('locales/_desc.json')).toEqual({ 'common.cancel': 'Closes without saving' })
	})

	it('refuses a key no locale has, a namespace alone, a group, and nothing to set', async () => {
		const project = await openProject({
			...threeLocales,
			'locales/en.json': { common: { save: 'Save', menu: { file: 'File' } } }
		})
		expect(await refusal(project.api.key.set({ path: 'common.nope', value: 'x' }))).toEqual({
			code: 'KEY_NOT_FOUND',
			message: '`common.nope` does not exist in any locale. `key add` creates keys'
		})
		expect(await refusal(project.api.key.set({ path: 'common', value: 'x' }))).toEqual({
			code: 'INVALID_INPUT',
			message:
				'`common` is not a usable key path. That names only a namespace; a key is its namespace, then its name: common.save.'
		})
		expect((await refusal(project.api.key.set({ path: 'common.menu', value: 'x' }))).code).toBe('KEY_NOT_FOUND')
		expect(await refusal(project.api.key.set({ path: 'common.save' }))).toEqual({
			code: 'INVALID_INPUT',
			message: 'Nothing to set: give a value, a translation or a description'
		})
	})
})

describe('key rename', () => {
	it('renames in place in every locale, its description with it', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.rename({ from: 'common.save', to: 'common.store' })
		expect(result.report.changes).toEqual([
			{ kind: 'renamed', path: 'common.store', from: 'common.save', locales: ['en', 'ckb'], description: true }
		])
		expect(Object.keys(((await project.json('locales/en.json')) as { common: object }).common)).toEqual([
			'store',
			'cancel'
		])
		expect(await project.json('locales/_desc.json')).toEqual({ 'common.store': 'The main button' })
	})

	it('moves a key to another namespace, at its end, dropping a group it leaves empty but keeping the namespace', async () => {
		const project = await openProject({
			'linguify.config.json': { locales: ['en'] },
			'locales/en.json': { common: { menu: { file: 'File' } }, home: { title: 'Home' } }
		})
		await project.api.key.rename({ from: 'common.menu.file', to: 'home.file' })
		expect(await project.json('locales/en.json')).toEqual({ common: {}, home: { title: 'Home', file: 'File' } })
	})

	it('refuses a key there already, the same path, and a move into itself', async () => {
		const project = await openProject(threeLocales)
		expect(await refusal(project.api.key.rename({ from: 'common.save', to: 'common.cancel' }))).toEqual({
			code: 'KEY_EXISTS',
			message: '`common.cancel` already exists in `en`, `ckb`'
		})
		expect((await refusal(project.api.key.rename({ from: 'common.save', to: 'common.save' }))).code).toBe(
			'INVALID_INPUT'
		)
		expect((await refusal(project.api.key.rename({ from: 'common', to: 'common.inner' }))).code).toBe('INVALID_INPUT')
	})
})

describe('key remove', () => {
	it('removes keys from every locale with their descriptions, skipping a path not there with a warning', async () => {
		const project = await openProject(threeLocales)
		const result = await project.api.key.remove({ paths: ['common.save', 'nope.x'] })
		expect(result.report).toEqual({
			changes: [{ kind: 'removed', path: 'common.save', locales: ['en', 'ckb'], description: true }],
			warnings: [{ code: 'KEY_NOT_FOUND', path: 'nope.x', message: '`nope.x` does not exist in any locale; skipped' }]
		})
		expect(await project.json('locales/en.json')).toEqual({ common: { cancel: 'Cancel' }, home: { title: 'Home' } })
		expect(await project.json('locales/_desc.json')).toEqual({})
	})

	it('keeps a namespace it empties', async () => {
		const project = await openProject(threeLocales)
		await project.api.key.remove({ paths: ['home.title'] })
		expect(await project.json('locales/en.json')).toEqual({ common: { save: 'Save', cancel: 'Cancel' }, home: {} })
	})

	it('refuses an unusable path before removing anything', async () => {
		const project = await openProject(threeLocales)
		expect(await refusal(project.api.key.remove({ paths: ['common.save', 'common..x'] }))).toEqual({
			code: 'INVALID_INPUT',
			message:
				'Invalid input:\n  paths.1: Not a usable key path. A segment is empty: two dots together, or one at either end.'
		})
		expect(await project.json('locales/en.json')).toEqual(threeLocales['locales/en.json'])
	})
})

describe('a write after a hand edit', () => {
	it('is refused as stale when the caller names the revision it read', async () => {
		const project = await openProject(threeLocales)
		const { revision } = await project.api.catalogue.get()
		await project.write({ 'locales/en.json': { common: { save: 'Save it' } } })
		expect((await refusal(project.api.key.add({ path: 'common.delete', expectedRevision: revision }))).code).toBe(
			'STALE_CATALOGUE'
		)
		expect(await project.json('locales/en.json')).toEqual({ common: { save: 'Save it' } })
	})
})
