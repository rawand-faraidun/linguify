/**
 * the encoding every file linguify reads or writes uses
 */
export const fileEncoding = 'utf8'

/**
 * the line ending of every file linguify writes
 */
export const lineEnding = '\n'

/**
 * the line ending Windows tools write, and Git on Windows checks files out with by default
 * (`core.autocrlf`)
 */
export const windowsLineEnding = '\r\n'

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

/**
 * the character a tab-indented file is indented with
 */
export const tabCharacter = '\t'

/**
 * the Node.js error codes linguify tells apart when a file or a stream cannot be used
 */
export const fileErrorCodes = {
	notFound: 'ENOENT',
	notADirectory: 'ENOTDIR',
	isADirectory: 'EISDIR',
	accessDenied: 'EACCES',
	notPermitted: 'EPERM',

	/**
	 * the reader at the other end of a pipe has stopped reading
	 */
	brokenPipe: 'EPIPE',

	/**
	 * the port a server asked for is taken
	 */
	addressInUse: 'EADDRINUSE'
} as const

/**
 * how many files a write puts on disk at once
 *
 * @note each atomic write waits for its fsync; one at a time, a multi-file sync of hundreds of files
 * spent most of its time waiting, while unbounded, a large project would open every file at once
 */
export const parallelFileWrites = 16

/**
 * how a catalogue's revision is computed from the files it was read from
 */
export const revisionHashing = {
	algorithm: 'sha256',
	encoding: 'hex',

	/**
	 * written between a file's path and its text, and after the text, so no two different sets of
	 * files can run together into the same input
	 */
	separator: '\u0000',

	/**
	 * stands in for a file that does not exist, so "the file is missing" and "the file is empty" give
	 * different revisions — creating an empty file is a change too
	 */
	absentFile: '\u0000absent'
} as const

/**
 * how a file is laid out when the engine's options say nothing about it — the descriptions file under
 * an engine without formatting options, say; tabs, like every other default
 */
export const defaultFileFormat = {
	indentation: 2,
	indentationStyle: 'tab',
	finalNewline: true
} as const
