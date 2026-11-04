import { keyRows } from '@linguify/keys'
import {
	cellMark,
	countUntranslated,
	filterKeys,
	matchCountText,
	namespaceFilterLabel,
	nextSort,
	noFilter,
	rowSourceOf,
	sortKeys,
	toggleNamespace,
	toggleUntranslated,
	untranslatedFilterLabel
} from '@linguify/table'
import type { KeyRow } from '@linguify/types'
import { describe, expect, it } from 'vitest'
import { openProject, threeLocales } from '../../setup/caller'

const rows: KeyRow[] = [
	{ key: 'common.save', description: 'The main button', values: { en: 'Save', ckb: 'پاشەکەوتکردن' } },
	{ key: 'common.Cancel', values: { en: 'Cancel', ckb: '' } },
	{ key: 'home.title', values: { en: 'Home', ckb: 'سەرەکی' } },
	{ key: 'home.menu', values: { en: 'Menu' } },
	{ key: 'extra.only', values: { ckb: 'تەنها' } }
]
const keys = (shown: readonly KeyRow[]) => shown.map(row => row.key)

describe('the rows the UI builds, against the API', () => {
	it('equal list keys, and their counts equal diff — the UI never computes its own', async () => {
		const project = await openProject(threeLocales)
		const config = await project.api.config.get()
		const { catalogue } = await project.api.catalogue.get()
		const source = rowSourceOf(config)
		const built = keyRows(catalogue, source)
		expect(built).toEqual(await project.api.list.keys())
		const counts = countUntranslated(built, source.locales, source.default)
		const diff = await project.api.diff()
		expect(counts).toEqual(
			Object.fromEntries(
				diff.map(({ locale, missing, extra, empty }) => [
					locale,
					{ missing: missing.length, empty: empty.length, extra: extra.length }
				])
			)
		)
	})
})

describe('cellMark', () => {
	it('marks missing, empty and extra against the default, a dash or blank otherwise', () => {
		expect(rows.map(row => cellMark(row, 'ckb', 'en'))).toEqual([undefined, 'empty', undefined, 'missing', 'extra'])
		expect(cellMark(rows[4] as KeyRow, 'en', 'en')).toBe('absent')
		expect(cellMark({ key: 'a.b', values: { en: '' } }, 'en', 'en')).toBe('blank')
	})
})

describe('filterKeys', () => {
	it('searches key paths, texts and descriptions in any case, a blank search keeping all', () => {
		expect(keys(filterKeys(rows, { search: 'cancel' }, 'en'))).toEqual(['common.Cancel'])
		expect(keys(filterKeys(rows, { search: 'سەرەکی' }, 'en'))).toEqual(['home.title'])
		expect(keys(filterKeys(rows, { search: 'MAIN BUTTON' }, 'en'))).toEqual(['common.save'])
		expect(filterKeys(rows, { search: '' }, 'en')).toHaveLength(5)
	})

	it('finds Kurdish Sorani typed on an Arabic keyboard, and ignores the zero-width non-joiner', () => {
		const kurdish = [{ key: 'a.b', values: { ckb: 'کتێب ی' } }]
		expect(filterKeys(kurdish, { search: 'كتێب' }, 'en')).toHaveLength(1)
		expect(filterKeys(kurdish, { search: 'ي' }, 'en')).toHaveLength(1)
		expect(filterKeys([{ key: 'a.b', values: { ckb: 'نامە‌کان' } }], { search: 'نامەکان' }, 'en')).toHaveLength(1)
	})

	it('keeps what is still to translate in any locale asked, never a key the default lacks', () => {
		expect(keys(filterKeys(rows, { untranslatedIn: ['ckb'] }, 'en'))).toEqual(['common.Cancel', 'home.menu'])
	})

	it('keeps the namespaces chosen, every part of a filter agreeing', () => {
		expect(keys(filterKeys(rows, { namespaces: ['home'] }, 'en'))).toEqual(['home.title', 'home.menu'])
		expect(keys(filterKeys(rows, { namespaces: ['home'], untranslatedIn: ['ckb'], search: 'menu' }, 'en'))).toEqual([
			'home.menu'
		])
	})
})

describe('sortKeys', () => {
	it('sorts by key either way, on screen only', () => {
		const ascending = sortKeys(rows, { column: { by: 'key' }, direction: 'ascending' })
		expect(keys(ascending)).toEqual(['common.Cancel', 'common.save', 'extra.only', 'home.menu', 'home.title'])
		expect(keys(sortKeys(rows, { column: { by: 'key' }, direction: 'descending' }))).toEqual(keys(ascending).reverse())
		expect(keys(rows)[0]).toBe('common.save')
	})

	it("sorts by a locale's text as that language orders it, an empty or missing text last", () => {
		const kurdish: KeyRow[] = [
			{ key: 'a', values: { ckb: 'سێو' } },
			{ key: 'b', values: { ckb: 'تەماتە' } },
			{ key: 'c', values: { ckb: '' } },
			{ key: 'd', values: {} },
			{ key: 'e', values: { ckb: 'پیاز' } }
		]
		expect(keys(sortKeys(kurdish, { column: { by: 'locale', locale: 'ckb' }, direction: 'ascending' }))).toEqual([
			'e',
			'b',
			'a',
			'c',
			'd'
		])
	})

	it('cycles ascending, descending, then off', () => {
		const column = { by: 'locale', locale: 'ckb' } as const
		const first = nextSort(undefined, column)
		expect([first?.direction, nextSort(first, column)?.direction, nextSort(nextSort(first, column), column)]).toEqual([
			'ascending',
			'descending',
			undefined
		])
		expect(nextSort(first, { by: 'key' })?.direction).toBe('ascending')
	})
})

describe('the filter controls', () => {
	it('toggle a namespace, all chosen being none', () => {
		const namespaces = ['common', 'home']
		const one = toggleNamespace(noFilter, namespaces, 'home', true)
		expect(one.namespaces).toEqual(['home'])
		expect(toggleNamespace(one, namespaces, 'home', false).namespaces).toBeUndefined()
	})

	it('say what is chosen in their labels', () => {
		expect(namespaceFilterLabel(noFilter, ['common', 'home'])).toBe('Namespaces')
		expect(namespaceFilterLabel({ ...noFilter, namespaces: ['home'] }, ['common', 'home'])).toBe('Namespaces (1 of 2)')
		const ckb = toggleUntranslated(noFilter, 'ckb', true)
		expect(untranslatedFilterLabel(ckb, ['ckb', 'de'])).toBe('Missing (ckb)')
		expect(untranslatedFilterLabel(toggleUntranslated(ckb, 'de', true), ['ckb', 'de'])).toBe('Missing (ckb, de)')
	})

	it('count the keys shown, out of all when filtered', () => {
		expect(matchCountText(noFilter, 5, 5)).toBe('5 keys')
		expect(matchCountText({ ...noFilter, search: 'x' }, 1, 5)).toBe('1 of 5 keys')
	})
})
