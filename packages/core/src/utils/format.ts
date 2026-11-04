import { indentationStyles, lineEnding, tabCharacter } from '@linguify/constants'
import type { IndentationStyle } from '@linguify/types'

/**
 * how a written JSON file is laid out
 */
export type FormatOptions = {
	/**
	 * spaces per level; `0` writes the whole file on one line
	 */
	indentation: number
	indentationStyle: IndentationStyle
	finalNewline: boolean
}

/**
 * serialises an object as a JSON file's content
 *
 * @note with tabs, each level is one tab — a tab's width is the reader's editor setting, so
 * `indentation` only sizes spaces; `0` still means one line with either style
 *
 * @param value - the object to write
 * @param options - layout options
 *
 * @returns the file content, Unicode written as is rather than escaped
 */
export const formatJson = (value: object, { indentation, indentationStyle, finalNewline }: FormatOptions): string => {
	const indent = indentation === 0 ? undefined : indentationStyle === indentationStyles.tab ? tabCharacter : indentation
	const content = JSON.stringify(value, null, indent)
	return finalNewline ? `${content}${lineEnding}` : content
}
