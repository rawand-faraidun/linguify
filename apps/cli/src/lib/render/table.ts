import { styleText } from 'node:util'
import { cliTableBorders, cliTableMinimumColumnWidth } from '@linguify/constants'
import { columnWidth, dim, padToWidth } from './text'

/**
 * one cell of a table: its text, as plain text — styled only once it is wrapped, so wrapping never cuts
 * through a colour code
 */
export type Cell = {
	text: string

	/**
	 * show it dimmed — a marker, not a translation
	 */
	dim?: boolean
}

/**
 * splits text into its user-perceived characters, so a hard break never separates a letter from its
 * marks
 */
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * @param head - the column titles
 * @param rows - the cells, one array per row, in the same order as `head`
 *
 * @returns the table, its head bold and ruled off. At a terminal it is fitted to the terminal's width:
 * when it would be wider, the widest columns are narrowed and their text wrapped, at spaces where it can
 * be; piped, it keeps its natural width
 */
export const renderTable = (head: string[], rows: Cell[][]): string => {
	const widths = fitColumns(
		[head.map(text => ({ text })), ...rows],
		process.stdout.isTTY ? process.stdout.columns : undefined
	)
	const rule = ([left, crossing, right]: readonly [string, string, string]) =>
		`${left}${widths.map(width => cliTableBorders.horizontal.repeat(width + 2)).join(crossing)}${right}`
	const line = (cells: Cell[], bold = false): string[] => {
		const wrapped = widths.map((width, column) => wrapCell(cells[column]?.text ?? '', width))
		const height = Math.max(1, ...wrapped.map(lines => lines.length))
		return Array.from({ length: height }, (_, index) => {
			const shown = wrapped.map((lines, column) => {
				const text = lines[index] ?? ''
				const styled =
					text === ''
						? text
						: bold
							? styleText('bold', text, { stream: process.stdout })
							: cells[column]?.dim
								? dim(text)
								: text
				return ` ${padToWidth(styled, widths[column] ?? 0)} `
			})
			return `${cliTableBorders.vertical}${shown.join(cliTableBorders.vertical)}${cliTableBorders.vertical}`
		})
	}
	return `${[
		rule(cliTableBorders.top),
		...line(
			head.map(text => ({ text })),
			true
		),
		rule(cliTableBorders.underHead),
		...rows.flatMap(row => line(row)),
		rule(cliTableBorders.bottom)
	].join('\n')}\n`
}

/**
 * shares the terminal's width between the columns: each gets what it needs when that is no more than an
 * equal share of what is left, and the wider ones split the rest
 *
 * @param lines - every row, the head included
 * @param width - the terminal's width; none when piped
 *
 * @returns each column's text width
 */
const fitColumns = (lines: Cell[][], width: number | undefined): number[] => {
	const columns = lines[0]?.length ?? 0
	const natural = Array.from({ length: columns }, (_, column) =>
		Math.max(1, ...lines.flatMap(line => (line[column]?.text ?? '').split('\n').map(columnWidth)))
	)
	// each column adds a space either side and a border after it, and the table one border before
	let available = (width ?? Number.POSITIVE_INFINITY) - (columns * 3 + 1)
	if (natural.reduce((sum, each) => sum + each, 0) <= available) return natural

	const widths = [...natural]
	const narrowestFirst = natural.map((need, column) => ({ need, column })).sort((a, b) => a.need - b.need)
	for (const [index, { need, column }] of narrowestFirst.entries()) {
		const share = Math.floor(available / (columns - index))
		const given = Math.max(cliTableMinimumColumnWidth, Math.min(need, share))
		widths[column] = given
		available -= given
	}
	return widths
}

/**
 * @param text - a cell's text; line breaks start new lines
 * @param width - the columns each line may take
 *
 * @returns its lines, wrapped to the width
 */
const wrapCell = (text: string, width: number): string[] => text.split('\n').flatMap(line => wrapLine(line, width))

/**
 * @param text - one line of text
 * @param width - the columns it may take
 *
 * @returns it in lines no wider than that: broken at spaces, dropping the space at each break; a word
 * wider than a whole line is broken between its characters, so no text is ever cut off
 */
const wrapLine = (text: string, width: number): string[] => {
	const lines: string[] = []
	let current = ''
	for (const token of text.split(/(\s+)/)) {
		if (token === '') continue
		if (columnWidth(current + token) <= width) {
			current += token
			continue
		}
		if (current !== '') lines.push(current.trimEnd())
		current = ''
		if (/^\s+$/.test(token)) continue
		for (const { segment } of graphemes.segment(token)) {
			if (current !== '' && columnWidth(current + segment) > width) {
				lines.push(current)
				current = ''
			}
			current += segment
		}
	}
	return [...lines, current]
}
