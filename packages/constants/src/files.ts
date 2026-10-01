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
