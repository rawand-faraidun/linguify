import { type RefObject, useLayoutEffect } from 'react'
import { rowKinds, tableControls, tableId } from '@linguify/constants'
import type { NamespaceName } from '@linguify/types'
import { rowId } from '../rows'

/**
 * the table's columns that are not a locale's, as the keyboard tells them apart
 */
const fixedColumns = { select: 'select', description: 'description' } as const

/**
 * keeps a table at exactly one stop for Tab: given one when it has none — a text a person can open when
 * there is one, so the hint on moving is heard on the way in, else its first control — and, when a control
 * came back as the stop beside another, the one with the keyboard kept, else the first
 *
 * @note the studio and the extension draw their own tables; both mark their controls with the attributes in
 * `tableControls`, and move between them with these functions
 *
 * @param table - the table
 */
export const keepTableStop = (table: HTMLElement) => {
	const stops = [...table.querySelectorAll<HTMLElement>(tableControls.stop)]
	if (stops.length === 0) {
		;(table.querySelector(tableControls.text) ?? table.querySelector(tableControls.cell))?.setAttribute('tabindex', '0')
		return
	}
	const kept = stops.find(stop => stop === document.activeElement) ?? stops[0]
	for (const stop of stops) if (stop !== kept) stop.setAttribute('tabindex', '-1')
}

/**
 * keeps a table at one stop for Tab each time it is drawn — an editor that closes either draws it again, its
 * text written, or takes the keyboard back to its control, which `rove` makes the stop
 *
 * @param table - the table's ref
 */
export const useTableStop = (table: RefObject<HTMLElement | null>) => {
	useLayoutEffect(() => {
		if (table.current !== null) keepTableStop(table.current)
	})
}

/**
 * gives the keyboard to a table, on its one stop for Tab
 *
 * @param table - the table, or nothing when it is not on the page
 *
 * @returns whether there was a stop to give it to — none when the table shows nothing
 */
export const focusTableStop = (table: ParentNode | null): boolean => {
	const stop = table?.querySelector<HTMLElement>(tableControls.stop) ?? null
	stop?.focus()
	return stop !== null
}

/**
 * makes the control just focused the table's one stop for Tab — all the others are reached with the arrow keys,
 * so the table is one step in the page however many texts it holds
 *
 * @param table - the table
 * @param target - what was focused
 */
export const rove = (table: HTMLElement, target: EventTarget | null) => {
	if (!(target instanceof HTMLElement) || !target.matches(tableControls.cell)) return
	for (const other of table.querySelectorAll(tableControls.stop)) other.setAttribute('tabindex', '-1')
	target.setAttribute('tabindex', '0')
}

/**
 * @param control - a control in a cell
 *
 * @returns its column: the checkboxes', a locale, the description, or the key's
 */
const columnOf = (control: Element): string =>
	control.closest('[data-select]') !== null
		? fixedColumns.select
		: (control.closest('[data-locale]')?.getAttribute('data-locale') ??
			(control.closest('[data-description]') === null ? '' : fixedColumns.description))

/**
 * where a key moves the keyboard between a table's controls: left and right along a row, up and down a
 * column, Home and End to a row's ends
 *
 * @note a key held with a modifier is left alone — Ctrl+Home, Alt+Arrow and a screen reader's own keys
 * belong to the browser and the reader
 *
 * @param table - the table
 * @param event - the key pressed, where, and with which modifiers
 *
 * @returns the control to move to, or nothing when the key does not move or there is nowhere to go
 */
export const controlAfter = (
	table: HTMLElement,
	{
		target: from,
		key,
		altKey,
		ctrlKey,
		metaKey,
		shiftKey
	}: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'> & { target: EventTarget | null }
): HTMLElement | undefined => {
	if (altKey || ctrlKey || metaKey || shiftKey) return undefined
	if (!(from instanceof HTMLElement) || !from.matches(tableControls.cell)) return undefined
	const controls = [...table.querySelectorAll<HTMLElement>(tableControls.cell)]
	const at = controls.indexOf(from)
	const row = from.closest('tr')
	const sameRow = controls.filter(control => control.closest('tr') === row)
	const column = columnOf(from)
	const below = (control: HTMLElement) => control.closest('tr') !== row && columnOf(control) === column
	if (key === 'ArrowRight') return sameRow[sameRow.indexOf(from) + 1]
	if (key === 'ArrowLeft') return sameRow[sameRow.indexOf(from) - 1]
	if (key === 'ArrowDown') return controls.slice(at + 1).find(below)
	if (key === 'ArrowUp') return controls.slice(0, at).reverse().find(below)
	if (key === 'Home') return sameRow[0]
	if (key === 'End') return sameRow.at(-1)
	return undefined
}

/**
 * @param id - a row's id
 *
 * @returns the selector of that row in the table
 */
export const rowSelector = (id: string): string => `#${tableId} tr[data-row="${CSS.escape(id)}"]`

/**
 * gives the keyboard to a namespace's section once its dialog has closed — written, to its disclosure, or
 * its rename when it holds no key; cancelled, back to its rename
 *
 * @param namespace - the namespace written, or the one a cancelled rename was about
 * @param written - whether the dialog wrote it
 *
 * @returns whether the section took the keyboard — it may be hidden, or there was none to take it
 */
export const focusSection = (namespace: NamespaceName | undefined, written: boolean): boolean => {
	const row = namespace === undefined ? null : document.querySelector(rowSelector(rowId(rowKinds.section, namespace)))
	const target =
		(written
			? (row?.querySelector<HTMLElement>(tableControls.disclosure) ??
				row?.querySelector<HTMLElement>(tableControls.rename))
			: row?.querySelector<HTMLElement>(tableControls.rename)) ?? null
	if (target === null) return false
	target.focus()
	target.scrollIntoView({ block: 'nearest' })
	return true
}
