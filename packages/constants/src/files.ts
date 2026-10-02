/**
 * the encoding every file linguify reads or writes uses
 */
export const fileEncoding = 'utf8'

/**
 * the line ending of every file linguify writes
 */
export const lineEnding = '\n'

/**
 * the widest indentation a written file can use
 *
 * @note `JSON.stringify` silently caps indentation at 10, so a wider setting would be accepted and
 * then ignored; the config schema rejects it instead
 */
export const maxIndentation = 10

/**
 * a plain file name: no folder separators, and not `.` or `..`
 *
 * @note file names from the config are joined onto a folder, so a separator or `..` would let one
 * point outside it
 */
export const fileNamePattern = /^(?!\.{1,2}$)[^/\\]+$/

/**
 * the invisible character some editors — Windows Notepad among them — put at the start of a UTF-8
 * file; `JSON.parse` rejects it, so it is dropped before parsing
 */
export const byteOrderMark = '﻿'

/**
 * how linguify lays out the files it generates for itself, such as `schema.json` — the repository's
 * own style, one tab per level
 */
export const generatedFileFormat = {
	indentation: 2,
	indentationStyle: 'tab',
	finalNewline: true
} as const
