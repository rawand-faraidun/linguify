/**
 * a character XML 1.0 cannot hold — most control characters — plus the carriage return, which XML
 * readers turn into a plain line feed
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point — they are what gets escaped
const unsafe = /[\u0000-\u0008\u000B-\u000D\u000E-\u001F\uFFFE\uFFFF]/g

/**
 * an underscore that would read as the start of an escape
 */
const escapeLike = /_(?=x[0-9A-Fa-f]{4}_)/g

/**
 * an escape, as a spreadsheet stores it
 */
const escaped = /_x([0-9A-Fa-f]{4})_/g

/**
 * hex digits in an escape
 */
const escapeWidth = 4

/**
 * escapes text for an xlsx cell the way Excel does (ECMA-376 `ST_Xstring`): a character XML cannot hold
 * becomes `_xHHHH_`, and an underscore that would read as such an escape becomes `_x005F_`
 *
 * @note without it, a control character is dropped from the file and a carriage return comes back as a
 * line feed, so a translation would change on its way through a spreadsheet
 *
 * @param text - a cell's text
 *
 * @returns the text to store
 */
export const escapeXstring = (text: string): string =>
	text.replace(escapeLike, escapeCharacter).replace(unsafe, escapeCharacter)

/**
 * @param character - one character
 *
 * @returns its `_xHHHH_` escape — valid for any character, which every spreadsheet reader decodes
 */
export const escapeCharacter = (character: string): string =>
	`_x${character.charCodeAt(0).toString(16).toUpperCase().padStart(escapeWidth, '0')}_`

/**
 * reverses {@link escapeXstring}, for cells Excel, Google Sheets or linguify wrote
 *
 * @param text - a cell's stored text
 *
 * @returns the text itself
 */
export const unescapeXstring = (text: string): string =>
	text.replace(escaped, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
