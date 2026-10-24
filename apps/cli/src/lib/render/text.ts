import { styleText } from 'node:util'
import { cliFieldSeparator, cliTextMarkers } from '@linguify/constants'
import stringWidth from 'string-width'

/**
 * every control character — a terminal acts on them instead of showing them
 */
const controlCharacters = /\p{Cc}/gu

/**
 * every control character but the line break
 */
const controlCharactersButLineBreak = /(?!\n)\p{Cc}/gu

/**
 * how the common control characters are written out
 */
const escapes: Record<string, string> = { '\n': '\\n', '\r': '\\r', '\t': '\\t' }

/**
 * @param text - a translation or key, as it is in the files
 * @param lineBreaks - keep line breaks as line breaks, for a table cell that can hold several lines
 *
 * @returns it safe to print: each control character written out — `\n`, `\u001b` — so a translation
 * can neither move the cursor nor recolour the terminal, nor break a one-per-line listing; format
 * characters, such as the zero-width non-joiner Kurdish uses, are left as they are
 */
export const printable = (text: string, lineBreaks = false): string =>
	(lineBreaks ? text.replace(/\r\n?/g, '\n') : text).replace(
		lineBreaks ? controlCharactersButLineBreak : controlCharacters,
		character => escapes[character] ?? `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
	)

/**
 * @returns whether a person is reading: output goes to a terminal
 *
 * @note piped, a listing is for a script — one item per line, nothing added: no markers, no summary,
 * ready for `grep` or `wc -l`
 */
export const atTerminal = (): boolean => process.stdout.isTTY === true

/**
 * @param text - a line of decoration — a marker, a summary
 *
 * @returns it dimmed
 */
export const dim = (text: string): string => styleText('dim', text, { stream: process.stdout })

/**
 * @param text - a locale's text for a key, or `undefined` when the locale lacks it
 *
 * @returns the marker that stands in its place when there is no text to show — `(missing)`, `(empty)`
 */
export const markerFor = (text: string | undefined): string | undefined =>
	text === undefined ? cliTextMarkers.missing : text === '' ? cliTextMarkers.empty : undefined

/**
 * @param text - a locale's text for a key, or `undefined` when the locale lacks it
 *
 * @returns the text to show on one line — or, at a terminal, a dimmed marker saying it is missing or
 * empty; piped, nothing
 */
export const showText = (text: string | undefined): string => {
	const marker = markerFor(text)
	if (marker === undefined) return printable(text ?? '')
	return atTerminal() ? dim(marker) : ''
}

/**
 * @param parts - the facts to summarise — `12 keys`, `2 missing`
 *
 * @returns a dimmed closing line after a blank one, at a terminal only
 */
export const summary = (...parts: string[]): string[] => (atTerminal() ? ['', dim(parts.join(' · '))] : [])

/**
 * @param count - how many
 * @param noun - what, in the singular — `key`
 *
 * @returns the count and the noun, plural unless it is one — `1 key`, `12 keys`
 */
export const counted = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * @param text - a line, perhaps coloured
 *
 * @returns how many columns it takes in a terminal — colour codes and zero-width characters, such as
 * the non-joiner Kurdish uses, take none; a Chinese character takes two
 */
export const columnWidth = (text: string): number => stringWidth(text)

/**
 * @param text - a line, perhaps coloured
 * @param width - the columns it should fill
 *
 * @returns it, padded with spaces to that width
 */
export const padToWidth = (text: string, width: number): string =>
	`${text}${' '.repeat(Math.max(0, width - columnWidth(text)))}`

/**
 * @param values - one line's columns
 *
 * @returns them as one line of piped output: tab-separated and unpadded, so the columns split the same
 * way in every project
 */
export const fields = (...values: string[]): string => values.join(cliFieldSeparator)
