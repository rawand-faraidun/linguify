import { diffTally, inSyncVerdict } from '@linguify/keys'
import { describe, expect, it } from 'vitest'

const none = { missing: [], extra: [], empty: [] }

describe('diffTally', () => {
	it('counts each kind, leaving empty kinds out', () => {
		expect(diffTally({ locale: 'ckb', ...none, missing: ['a', 'b', 'c'], empty: ['d'] })).toBe('3 missing · 1 empty')
		expect(diffTally({ locale: 'ckb', ...none })).toBe('in sync')
	})
})

describe('inSyncVerdict', () => {
	it('says there is nothing to compare, or that one or every locale is in sync', () => {
		expect(inSyncVerdict([])).toBe('There is only the default locale — nothing to compare it with')
		expect(inSyncVerdict([{ locale: 'ckb', ...none }])).toBe('ckb is in sync with the default')
		expect(
			inSyncVerdict([
				{ locale: 'ckb', ...none },
				{ locale: 'de', ...none }
			])
		).toBe('Every locale is in sync with the default')
	})

	it('says nothing when a locale differs', () => {
		expect(
			inSyncVerdict([
				{ locale: 'ckb', ...none },
				{ locale: 'de', ...none, extra: ['x'] }
			])
		).toBeUndefined()
	})
})
