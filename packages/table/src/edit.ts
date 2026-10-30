import type { KeyPath, Locale } from '@linguify/types'

/**
 * one change a person makes in the table: a key's text in one locale, or its description
 */
export type KeyEdit = { key: KeyPath } & ({ locale: Locale; text: string } | { description: string })

/**
 * what `key.set` is asked to do for an edit
 *
 * @note every locale's text goes in `translations`, the default's included — `key.set` refuses the default
 * only when it is also given as `value`
 *
 * @param edit - the change
 *
 * @returns the path, and the one text or description to set
 */
export const keyEditInput = (
	edit: KeyEdit
): { path: KeyPath } & ({ translations: Record<Locale, string> } | { description: string }) =>
	'description' in edit
		? { path: edit.key, description: edit.description }
		: { path: edit.key, translations: { [edit.locale]: edit.text } }
