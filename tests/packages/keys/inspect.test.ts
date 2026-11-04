import {
	findConflicts,
	findDuplicate,
	hasNamespace,
	inspectKeyPath,
	namespaceHolders,
	namespacesIn
} from '@linguify/keys'
import type { Catalogue } from '@linguify/types'
import { describe, expect, it } from 'vitest'

describe('inspectKeyPath', () => {
	const en = { common: { save: 'Save', buttons: { ok: 'OK' } }, title: 'Home', empty: {} }

	it.each([
		['common.cancel', { state: 'free' }],
		['nope.deep.key', { state: 'free' }],
		['common.save', { state: 'translation' }],
		['common.buttons', { state: 'group' }],
		['empty', { state: 'group' }],
		['common.save.label', { state: 'blocked', at: 'common.save' }],
		['title.a.b.c', { state: 'blocked', at: 'title' }],
		['toString', { state: 'free' }],
		['common.hasOwnProperty', { state: 'free' }]
	])('%s', (path, inspection) => {
		expect(inspectKeyPath(en, path)).toEqual(inspection)
	})

	it('reads a numeric segment as a key', () => {
		expect(inspectKeyPath({ errors: { '404': 'Not found' } }, 'errors.404')).toEqual({ state: 'translation' })
	})
})

const catalogue: Catalogue = {
	locales: {
		en: { common: { save: 'Save' }, home: { title: 'Home' } },
		ckb: { common: 'هاوبەش', home: { title: 'ماڵەوە', banner: { text: 'بەخێربێیت' } } }
	},
	descriptions: {}
}

describe('findDuplicate', () => {
	it('names every locale with a text there', () => {
		expect(findDuplicate(catalogue, 'home.title')).toEqual(['en', 'ckb'])
		expect(findDuplicate(catalogue, 'common.save')).toEqual(['en'])
		expect(findDuplicate(catalogue, 'home.subtitle')).toEqual([])
	})
})

describe('findConflicts', () => {
	it('names a locale where a text blocks the path, or a group already holds it', () => {
		expect(findConflicts(catalogue, 'common.cancel')).toEqual([{ locale: 'ckb', state: 'blocked', at: 'common' }])
		expect(findConflicts(catalogue, 'home.banner')).toEqual([{ locale: 'ckb', state: 'group', at: 'home.banner' }])
	})

	it('finds none for a free path or a duplicate', () => {
		expect(findConflicts(catalogue, 'home.subtitle')).toEqual([])
		expect(findConflicts(catalogue, 'home.title')).toEqual([])
	})
})

describe('namespaces', () => {
	const spread: Catalogue = {
		locales: { en: { common: {}, home: {} }, ckb: { common: {}, extra: {} } },
		descriptions: {}
	}

	it('finds which locales hold a namespace, and every namespace in order of first sight', () => {
		expect(hasNamespace(spread, 'extra')).toBe(true)
		expect(hasNamespace(spread, 'toString')).toBe(false)
		expect(namespaceHolders(spread, 'common')).toEqual(['en', 'ckb'])
		expect(namespaceHolders(spread, 'common', ['ckb'])).toEqual(['ckb'])
		expect(namespacesIn(spread)).toEqual(['common', 'home', 'extra'])
		expect(namespacesIn(spread, ['ckb'])).toEqual(['common', 'extra'])
	})
})
