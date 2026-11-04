import { buildRows, expandedExpansion } from '@linguify/table'
import type { KeyRow } from '@linguify/types'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Grid } from '../../apps/extension/src/webview/grid'

/**
 * the props the studio's table and the panel's grid share — one contract, so one spec tests both
 */
export type TableProps = ComponentProps<typeof Grid>

const keys: KeyRow[] = [
	{ key: 'common.save', description: 'The main button', values: { en: 'Save', ckb: 'پاشەکەوتکردن' } },
	{ key: 'common.cancel', values: { en: 'Cancel', ckb: '' } },
	{ key: 'home.title', values: { en: 'Home' } }
]

/**
 * draws a table with a project in English and Kurdish Sorani, every row open, each handler a mock
 */
const draw = (Table: ComponentType<TableProps>, overrides: Partial<TableProps> = {}) => {
	const props: TableProps = {
		rows: buildRows('flat', keys, { namespaced: true }),
		mode: 'flat',
		source: { locales: ['en', 'ckb'], default: 'en', descriptions: true },
		expansion: expandedExpansion,
		onToggle: vi.fn(),
		sort: undefined,
		onSort: vi.fn(),
		onEdit: vi.fn(() => Promise.resolve()),
		selection: new Set(),
		onSelect: vi.fn(),
		onSelectAll: vi.fn(),
		onRename: vi.fn(),
		onRenameKey: vi.fn(),
		...overrides
	}
	render(<Table {...props} />)
	return { props, table: screen.getByRole('table', { name: 'Translations' }) }
}

/**
 * @returns the row of a key or section, by its id
 */
const rowOf = (table: HTMLElement, id: string) => {
	const row = table.querySelector<HTMLElement>(`tr[data-row="${id}"]`)
	if (row === null) throw new Error(`no row ${id}`)
	return row
}

/**
 * the behaviour every surface's translation table must have, run against one of them
 *
 * @param name - the surface
 * @param Table - its table component
 */
export const describeTable = (name: string, Table: ComponentType<TableProps>) =>
	describe(name, () => {
		it('heads the key, the description, then the default locale first and the others', () => {
			const { table } = draw(Table)
			const heads = within(table)
				.getAllByRole('columnheader')
				.map(cell => cell.textContent?.replace(/\s+/g, ' ').trim())
			expect(heads.slice(1, 3)).toEqual([expect.stringContaining('Key'), 'Description'])
			expect(heads[3]).toMatch(/^en default/i)
			expect(heads[4]).toMatch(/^ckb/i)
		})

		it('draws a section per namespace with its keys, each text in its own direction and language', () => {
			const { table } = draw(Table)
			const ids = [...table.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-row'))
			expect(ids).toEqual(['section:common', 'key:common.save', 'key:common.cancel', 'section:home', 'key:home.title'])
			const kurdish = within(rowOf(table, 'key:common.save')).getByText('پاشەکەوتکردن')
			expect([kurdish.getAttribute('dir'), kurdish.closest('[lang]')?.getAttribute('lang')]).toEqual(['auto', 'ckb'])
		})

		it('marks a text that is empty, or missing, where the default has one', () => {
			const { table } = draw(Table)
			expect(within(rowOf(table, 'key:common.cancel')).getByText('empty')).toBeTruthy()
			expect(within(rowOf(table, 'key:home.title')).getByText('missing')).toBeTruthy()
		})

		it('opens a text on a click; Enter saves the change in that locale', async () => {
			const user = userEvent.setup()
			const { props, table } = draw(Table)
			await user.click(within(rowOf(table, 'key:common.save')).getByRole('button', { name: /ckb of common\.save/ }))
			const editor = within(table).getByRole('textbox', { name: 'ckb of common.save' })
			await user.clear(editor)
			await user.type(editor, 'هەڵگرتن{Enter}')
			expect(props.onEdit).toHaveBeenCalledWith({ key: 'common.save', locale: 'ckb', text: 'هەڵگرتن' })
		})

		it('cancels an open text on Escape, saving nothing', async () => {
			const user = userEvent.setup()
			const { props, table } = draw(Table)
			await user.click(within(rowOf(table, 'key:common.save')).getByRole('button', { name: /en of common\.save/ }))
			await user.type(within(table).getByRole('textbox', { name: 'en of common.save' }), ' it{Escape}')
			expect(within(table).queryByRole('textbox')).toBeNull()
			expect(props.onEdit).not.toHaveBeenCalled()
		})

		it('saves a description in its own column', async () => {
			const user = userEvent.setup()
			const { props, table } = draw(Table)
			await user.click(
				within(rowOf(table, 'key:common.save')).getByRole('button', { name: /Description of common\.save/ })
			)
			const editor = within(table).getByRole('textbox', { name: 'Description of common.save' })
			await user.clear(editor)
			await user.type(editor, 'Saves the form{Enter}')
			expect(props.onEdit).toHaveBeenCalledWith({ key: 'common.save', description: 'Saves the form' })
		})

		it('selects a key, a section, or everything shown, through their checkboxes', async () => {
			const user = userEvent.setup()
			const { props, table } = draw(Table)
			await user.click(within(table).getByRole('checkbox', { name: 'Select common.save' }))
			expect(props.onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'key:common.save' }))
			await user.click(within(table).getByRole('checkbox', { name: 'Select every key in common' }))
			expect(props.onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'section:common' }))
			await user.click(within(table).getByRole('checkbox', { name: 'Select every key in view' }))
			expect(props.onSelectAll).toHaveBeenCalledOnce()
		})

		it('shows a selection: a key ticked, its section partly', () => {
			const { table } = draw(Table, { selection: new Set(['common.save']) })
			// the panel's native checkbox and the studio's own one, read alike — as a screen reader reads them
			const state = (name: string) => {
				const box = within(table).getByRole('checkbox', { name })
				if (box instanceof HTMLInputElement) return box.indeterminate ? 'mixed' : String(box.checked)
				return box.getAttribute('aria-checked')
			}
			expect([state('Select common.save'), state('Select every key in common'), state('Select home.title')]).toEqual([
				'true',
				'mixed',
				'false'
			])
		})

		it('opens and closes a section, renames it and a key, and sorts a column', async () => {
			const user = userEvent.setup()
			const { props, table } = draw(Table)
			await user.click(within(rowOf(table, 'section:common')).getByRole('button', { expanded: true }))
			expect(props.onToggle).toHaveBeenCalledWith('section:common')
			await user.click(within(table).getByRole('button', { name: 'Rename namespace common' }))
			expect(props.onRename).toHaveBeenCalledWith('common')
			await user.click(within(table).getByRole('button', { name: 'Rename key common.save' }))
			expect(props.onRenameKey).toHaveBeenCalledWith('common.save')
			await user.click(within(within(table).getAllByRole('columnheader')[4] as HTMLElement).getByRole('button'))
			expect(props.onSort).toHaveBeenCalledWith({ by: 'locale', locale: 'ckb' })
		})

		it('says which way a column is sorted', () => {
			const { table } = draw(Table, { sort: { column: { by: 'key' }, direction: 'descending' } })
			expect(within(table).getAllByRole('columnheader')[1]?.getAttribute('aria-sort')).toBe('descending')
		})

		it('is one stop for Tab; the arrows move between rows and cells', async () => {
			const user = userEvent.setup()
			const { table } = draw(Table)
			expect(table.querySelectorAll('[data-cell][tabindex="0"]')).toHaveLength(1)
			await user.click(within(rowOf(table, 'key:common.save')).getByRole('button', { name: /en of common\.save/ }))
			await user.keyboard('{Escape}')
			await user.keyboard('{ArrowDown}')
			expect(document.activeElement?.closest('tr')?.getAttribute('data-row')).toBe('key:common.cancel')
			await user.keyboard('{ArrowRight}')
			expect(document.activeElement?.closest('td')?.getAttribute('data-locale')).toBe('ckb')
		})

		it('draws the tree: a group by path segment, its keys by their last segment', () => {
			const { table } = draw(Table, {
				mode: 'tree',
				rows: buildRows('tree', [{ key: 'common.menu.file', values: { en: 'File' } }], { namespaced: true })
			})
			const ids = [...table.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-row'))
			expect(ids).toEqual(['section:common', 'group:common.menu', 'key:common.menu.file'])
		})
	})
