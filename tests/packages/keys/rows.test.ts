import { keyRows, localeOrder, translationGap } from '@linguify/keys'
import type { Catalogue } from '@linguify/types'
import { describe, expect, it } from 'vitest'

const catalogue: Catalogue = {
	locales: {
		ckb: { common: { save: 'پاشەکەوتکردن', extra: 'زیادە' } },
		en: { common: { save: 'Save', cancel: 'Cancel' } }
	},
	descriptions: { 'common.save': 'The main button' }
}

describe('localeOrder', () => {
	it('puts the default first, the rest in config order', () => {
		expect(localeOrder({ locales: ['ckb', 'de', 'en'], default: 'en' })).toEqual(['en', 'ckb', 'de'])
	})
})

describe('keyRows', () => {
	const source = { locales: ['en', 'ckb'], default: 'en', descriptions: true }

	it("lists every key in any locale, the default's first, each locale's text where it has one", () => {
		expect(keyRows(catalogue, source)).toEqual([
			{ key: 'common.save', description: 'The main button', values: { en: 'Save', ckb: 'پاشەکەوتکردن' } },
			{ key: 'common.cancel', values: { en: 'Cancel' } },
			{ key: 'common.extra', values: { ckb: 'زیادە' } }
		])
	})

	it('leaves descriptions out when the project has none, and texts of locales not shown', () => {
		expect(keyRows(catalogue, { ...source, descriptions: false }, ['ckb'])).toEqual([
			{ key: 'common.save', values: { ckb: 'پاشەکەوتکردن' } },
			{ key: 'common.cancel', values: {} },
			{ key: 'common.extra', values: { ckb: 'زیادە' } }
		])
	})
})

describe('translationGap', () => {
	it.each([
		['Save', 'پاشەکەوتکردن', undefined],
		['Save', undefined, 'missing'],
		['Save', '', 'empty'],
		[undefined, 'زیادە', 'extra'],
		[undefined, undefined, undefined],
		['', '', 'empty']
	])('default %j, locale %j → %s', (source, target, gap) => {
		expect(translationGap(source, target)).toBe(gap)
	})
})
