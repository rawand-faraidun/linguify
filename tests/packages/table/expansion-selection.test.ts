import {
	buildTreeRows,
	bulkDelete,
	collapsedExpansion,
	expandedExpansion,
	isExpanded,
	keepExisting,
	revealKey,
	sectionsExpansion,
	selectionState,
	shownState,
	type TableRow,
	toggleAll,
	toggleExpansion,
	toggleSelection
} from '@linguify/table'
import type { KeyRow } from '@linguify/types'
import { describe, expect, it } from 'vitest'

const keys: KeyRow[] = [
	{ key: 'common.save', values: { en: 'Save' } },
	{ key: 'common.menu.file', values: { en: 'File' } },
	{ key: 'common.menu.edit', values: { en: 'Edit' } },
	{ key: 'home.title', values: { en: 'Home' } }
]
const rows = buildTreeRows(keys, { namespaced: true })

/**
 * @returns the row with this id, at any depth
 */
const row = (id: string, within: readonly TableRow[] = rows): TableRow => {
	for (const candidate of within) {
		if (candidate.id === id) return candidate
		if (candidate.kind !== 'key') {
			const found = row(id, candidate.subRows)
			if (found !== undefined) return found
		}
	}
	return undefined as never
}

describe('expansion', () => {
	it('is a baseline with overrides: a row nobody touched follows it', () => {
		expect(isExpanded(collapsedExpansion, 'group:common.menu')).toBe(false)
		expect(isExpanded(expandedExpansion, 'group:common.menu')).toBe(true)
	})

	it('closing a section under expand all hides its groups without closing them', () => {
		const closed = toggleExpansion(expandedExpansion, 'section:common')
		expect([isExpanded(closed, 'section:common'), isExpanded(closed, 'group:common.menu')]).toEqual([false, true])
		expect(toggleExpansion(closed, 'section:common')).toEqual(expandedExpansion)
	})

	it('opens every section and group for sectionsExpansion, and a search on top of what is open', () => {
		const expansion = sectionsExpansion(rows)
		expect([
			expansion.all,
			['section:common', 'section:home', 'group:common.menu'].map(id => isExpanded(expansion, id))
		]).toEqual([false, [true, true, true]])
	})

	it('reveals a key by opening every row above it', () => {
		const tree = revealKey(collapsedExpansion, 'common.menu.file', { mode: 'tree', namespaced: true })
		expect(['section:common', 'group:common.menu', 'section:home'].map(id => isExpanded(tree, id))).toEqual([
			true,
			true,
			false
		])
		const flat = revealKey(collapsedExpansion, 'common.menu.file', { mode: 'flat', namespaced: true })
		expect(flat.overrides).toEqual({ 'section:common': true })
	})
})

describe('selection', () => {
	it('ticks every key below a group, the section above then partly selected', () => {
		const selection = toggleSelection(new Set(), row('group:common.menu'))
		expect([...selection].sort()).toEqual(['common.menu.edit', 'common.menu.file'])
		expect([
			selectionState(selection, row('group:common.menu')),
			selectionState(selection, row('section:common'))
		]).toEqual(['all', 'some'])
	})

	it('selects all of a partly selected section, and clears a wholly selected group', () => {
		const some = toggleSelection(new Set(), row('key:common.save'))
		expect(selectionState(toggleSelection(some, row('section:common')), row('section:common'))).toBe('all')
		const group = toggleSelection(new Set(), row('group:common.menu'))
		expect(toggleSelection(group, row('group:common.menu')).size).toBe(0)
	})

	it('selects every key shown, then none', () => {
		const all = toggleAll(new Set(), rows)
		expect([all.size, shownState(all, rows), toggleAll(all, rows).size]).toEqual([4, 'all', 0])
		expect(shownState(new Set(['common.save']), [])).toBe('none')
	})

	it('drops a key no longer there, keeping the very object when none went', () => {
		const selection = new Set(['common.save', 'gone.key'])
		expect([...keepExisting(selection, keys)]).toEqual(['common.save'])
		const unchanged = new Set(['common.save'])
		expect(keepExisting(unchanged, keys)).toBe(unchanged)
	})

	it('deletes the selected keys in the order they come, naming none that is gone', () => {
		const result = bulkDelete(new Set(['home.title', 'common.save', 'gone.key']), keys, keys)
		expect(result.paths).toEqual(['common.save', 'home.title'])
	})
})
