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

/**
 * a key a person is adding: its path, its description, and its text per locale
 */
export type NewKey = {
	path: KeyPath
	description: string
	texts: Readonly<Record<Locale, string>>
}

/**
 * what `key.add` is asked to do for a new key
 *
 * @note a text left empty is left out, so `keys.fillWithDefault` decides it as it would for `key add`; a
 * new namespace is created as `keys.createNamespace` says, as for `key add`
 *
 * @param key - the new key
 * @param defaultLocale - the default locale, whose text is the key's value
 *
 * @returns the path, the default's text, the others', and the description when given
 */
export const newKeyInput = (
	key: NewKey,
	defaultLocale: Locale
): {
	path: KeyPath
	value: string
	translations: Record<Locale, string>
	description?: string
} => ({
	path: key.path,
	value: key.texts[defaultLocale] ?? '',
	translations: Object.fromEntries(
		Object.entries(key.texts).filter(([locale, text]) => locale !== defaultLocale && text !== '')
	),
	...(key.description === '' ? {} : { description: key.description })
})
