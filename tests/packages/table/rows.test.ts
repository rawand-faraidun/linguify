import {
	availableViewModes,
	buildFlatRows,
	buildRows,
	buildTreeRows,
	keepUnchangedRows,
	type TableRow,
	usableViewMode
} from '@linguify/table'
import type { KeyRow } from '@linguify/types'
import { describe, expect, it } from 'vitest'

const keys: KeyRow[] = [
	{ key: 'common.save', description: 'Saves', values: { en: 'Save', ckb: 'پاشەکەوتکردن' } },
	{ key: 'common.menu.file', values: { en: 'File' } },
	{ key: 'common.menu.edit', values: { en: 'Edit' } },
	{ key: 'home.title', values: { en: 'Home' } }
]

/**
 * @returns each row as `id` and what it shows, its rows below it indented
 */
const outline = (rows: readonly TableRow[], depth = 0): string[] =>
	rows.flatMap(row => [
		`${'  '.repeat(depth)}${row.id} ${row.kind === 'key' ? row.label : `${row.kind === 'section' ? row.namespace : row.label} (${row.keys})`}`,
		...(row.kind === 'key' ? [] : outline(row.subRows, depth + 1))
	])

describe('buildFlatRows', () => {
	it('gives a section per namespace in the order its first key comes, each key under it by the rest of its path', () => {
		expect(outline(buildFlatRows(keys, { namespaced: true }))).toEqual([
			'section:common common (3)',
			'  key:common.save save',
			'  key:common.menu.file menu.file',
			'  key:common.menu.edit menu.edit',
			'section:home home (1)',
			'  key:home.title title'
		])
	})

	it('keeps a key its description and texts, a locale without one left out', () => {
		const [section] = buildFlatRows(keys, { namespaced: true })
		expect(section?.kind === 'section' && section.subRows[0]).toEqual({
			kind: 'key',
			id: 'key:common.save',
			key: 'common.save',
			label: 'save',
			description: 'Saves',
			values: { en: 'Save', ckb: 'پاشەکەوتکردن' }
		})
	})

	it('shows an empty namespace as an empty section, and no sections without namespaces', () => {
		expect(outline(buildFlatRows([], { namespaced: true, emptyNamespaces: ['account'] }))).toEqual([
			'section:account account (0)'
		])
		expect(outline(buildFlatRows(keys.slice(0, 2), { namespaced: false }))).toEqual([
			'key:common.save common.save',
			'key:common.menu.file common.menu.file'
		])
	})

	it('keeps a section called like a row kind apart from that kind', () => {
		const rows = buildFlatRows([{ key: 'key.section', values: { en: 'x' } }], { namespaced: true })
		expect(outline(rows)).toEqual(['section:key key (1)', '  key:key.section section'])
	})
})

describe('buildTreeRows', () => {
	it('groups keys by path segment under their sections, counting keys at any depth', () => {
		expect(outline(buildTreeRows(keys, { namespaced: true }))).toEqual([
			'section:common common (3)',
			'  key:common.save save',
			'  group:common.menu menu (2)',
			'    key:common.menu.file file',
			'    key:common.menu.edit edit',
			'section:home home (1)',
			'  key:home.title title'
		])
	})

	it('makes the top level groups without namespaces', () => {
		expect(outline(buildTreeRows(keys.slice(1, 3), { namespaced: false }))).toEqual([
			'group:common common (2)',
			'  group:common.menu menu (2)',
			'    key:common.menu.file file',
			'    key:common.menu.edit edit'
		])
	})

	it('keeps a key and a group of the same path apart, as one locale has a text where another nests', () => {
		const rows = buildTreeRows(
			[
				{ key: 'common.menu', values: { en: 'Menu' } },
				{ key: 'common.menu.file', values: { ckb: 'فایل' } }
			],
			{ namespaced: true }
		)
		expect(outline(rows)).toEqual([
			'section:common common (2)',
			'  key:common.menu menu',
			'  group:common.menu menu (1)',
			'    key:common.menu.file file'
		])
	})
})

describe('view modes', () => {
	it('offers the tree only where keys nest, and falls back to flat', () => {
		expect(availableViewModes({ nesting: true })).toEqual(['flat', 'tree'])
		expect(availableViewModes({ nesting: false })).toEqual(['flat'])
		expect(usableViewMode('tree', { nesting: false })).toBe('flat')
		expect(buildRows('tree', keys, { namespaced: true }).length).toBe(2)
	})
})

describe('keepUnchangedRows', () => {
	it('keeps the very row object for a key that did not change, so it does not redraw', () => {
		const next = keys.map(row => ({ ...row }))
		next[0] = { ...keys[0], values: { en: 'Store' } } as KeyRow
		const kept = keepUnchangedRows(keys, next)
		expect(kept.map((row, index) => row === keys[index])).toEqual([false, true, true, true])
	})
})
