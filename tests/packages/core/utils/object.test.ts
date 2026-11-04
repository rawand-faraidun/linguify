import { collectLeafPaths, getOwn, isPlainObject, mergeDeep } from '@linguify/core'
import { describe, expect, it } from 'vitest'

describe('isPlainObject', () => {
	it('is true only for an object literal or a null-prototype object', () => {
		expect([{}, Object.create(null), [], null, 'x', new Date(), new Map()].map(isPlainObject)).toEqual([
			true,
			true,
			false,
			false,
			false,
			false,
			false
		])
	})
})

describe('getOwn', () => {
	it('reads only own keys', () => {
		expect(getOwn({ a: 1 }, 'a')).toBe(1)
		expect(getOwn({ a: 1 }, 'toString')).toBeUndefined()
	})
})

describe('mergeDeep', () => {
	it('merges plain objects deep, the override winning, undefined never replacing a value', () => {
		expect(
			mergeDeep({ a: 1, b: { c: 2, d: 3 }, list: [1] }, { b: { d: 4, e: 5 }, list: [2], f: undefined, g: 6 })
		).toEqual({ a: 1, b: { c: 2, d: 4, e: 5 }, list: [2], g: 6 })
	})

	it('never reads an inherited key', () => {
		expect(mergeDeep({}, JSON.parse('{"__proto__": {"x": 1}}'))).toEqual(JSON.parse('{"__proto__": {"x": 1}}'))
		expect(({} as Record<string, unknown>).x).toBeUndefined()
	})
})

describe('collectLeafPaths', () => {
	it('lists the path to every value that is not a plain object', () => {
		expect(collectLeafPaths({ a: 1, b: { c: [1], d: { e: null } } })).toEqual([['a'], ['b', 'c'], ['b', 'd', 'e']])
	})
})
