import { describe, expect, it } from 'vitest'
import { openProject, refusal, threeLocales } from '../../../setup/caller'

describe('list', () => {
	it('lists the locales in config order with the default, and every namespace', async () => {
		const { api } = await openProject(threeLocales)
		expect(await api.list.locales()).toEqual({ default: 'en', locales: ['en', 'ckb', 'de'] })
		expect(await api.list.namespaces()).toEqual(['common', 'home', 'extra'])
	})

	it("lists every key, the default's first, with each locale's text and the description", async () => {
		const { api } = await openProject(threeLocales)
		expect(await api.list.keys()).toEqual([
			{ key: 'common.save', description: 'The main button', values: { en: 'Save', ckb: 'پاشەکەوتکردن' } },
			{ key: 'common.cancel', values: { en: 'Cancel', ckb: '' } },
			{ key: 'home.title', values: { en: 'Home' } },
			{ key: 'extra.only', values: { ckb: 'تەنها' } }
		])
		expect((await api.list.keys({ locale: 'ckb' })).map(row => row.values)).toEqual([
			{ ckb: 'پاشەکەوتکردن' },
			{ ckb: '' },
			{},
			{ ckb: 'تەنها' }
		])
	})

	it('refuses a locale not configured, naming those that are', async () => {
		const { api } = await openProject(threeLocales)
		expect(await refusal(api.list.keys({ locale: 'fr' }))).toEqual({
			code: 'LOCALE_UNKNOWN',
			message: '`fr` is not a configured locale. The config lists `en`, `ckb`, `de`'
		})
	})

	it('refuses to list namespaces in a project without them', async () => {
		const { api } = await openProject({
			'linguify.config.json': { options: { namespaces: false } },
			'locales/en.json': { title: 'Home' }
		})
		expect((await refusal(api.list.namespaces())).code).toBe('NAMESPACES_DISABLED')
		expect(await api.list.keys()).toEqual([{ key: 'title', values: { en: 'Home' } }])
	})
})

describe('diff', () => {
	it('gives each other locale its missing, extra and empty keys', async () => {
		const { api } = await openProject(threeLocales)
		expect(await api.diff()).toEqual([
			{ locale: 'ckb', missing: ['home.title'], extra: ['extra.only'], empty: ['common.cancel'] },
			{ locale: 'de', missing: ['common.save', 'common.cancel', 'home.title'], extra: [], empty: [] }
		])
		expect(await api.diff({ locale: 'de' })).toEqual([
			{ locale: 'de', missing: ['common.save', 'common.cancel', 'home.title'], extra: [], empty: [] }
		])
	})

	it('refuses the default, and a locale not configured', async () => {
		const { api } = await openProject(threeLocales)
		expect(await refusal(api.diff({ locale: 'en' }))).toEqual({
			code: 'INVALID_INPUT',
			message: '`en` is the default locale — `diff` compares the other locales against it'
		})
		expect((await refusal(api.diff({ locale: 'fr' }))).code).toBe('LOCALE_UNKNOWN')
	})

	it('counts a text against nested keys as missing on one side and extra on the other', async () => {
		const { api } = await openProject({
			'linguify.config.json': { locales: ['en', 'ckb'] },
			'locales/en.json': { common: { menu: 'Menu' } },
			'locales/ckb.json': { common: { menu: { file: 'فایل' } } }
		})
		expect(await api.diff()).toEqual([
			{ locale: 'ckb', missing: ['common.menu'], extra: ['common.menu.file'], empty: [] }
		])
	})
})
