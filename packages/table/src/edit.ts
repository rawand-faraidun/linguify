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
 * new namespace is created as `keys.createNamespace` says, as for `key add`. Every text goes by its locale,
 * the default's too — never as `value`, which core reads as whatever the default is when it writes
 *
 * @param key - the new key
 *
 * @returns the path, each text by its locale, and the description when given
 */
export const newKeyInput = (
	key: NewKey
): {
	path: KeyPath
	translations: Record<Locale, string>
	description?: string
} => ({
	path: key.path,
	translations: Object.fromEntries(Object.entries(key.texts).filter(([, text]) => text !== '')),
	...(key.description === '' ? {} : { description: key.description })
})

/**
 * a text as a browser's text field gives it back: every line break a line feed
 *
 * @param text - a text as stored
 *
 * @returns it with `\r\n` and a lone `\r` as `\n`
 */
const asTyped = (text: string): string => text.replace(/\r\n?/g, '\n')

/**
 * what an edit of a text writes — a text field gives every line break back as a line feed, so a text whose
 * breaks were all `\r\n` gets them back, and one opened and saved untouched writes nothing
 *
 * @param typed - what the field holds
 * @param stored - the text as the files hold it
 *
 * @returns the text to write, or `undefined` when it is the stored text, line breaks aside
 */
export const editedText = (typed: string, stored: string): string | undefined => {
	if (typed === asTyped(stored)) return undefined
	const crlf = stored.includes('\r\n') && !/\r(?!\n)|(?<!\r)\n/.test(stored)
	return crlf ? typed.replace(/\n/g, '\r\n') : typed
}
