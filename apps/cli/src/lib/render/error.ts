import { styleText } from 'node:util'
import type { SerializedError } from '@linguify/types'
import { printable } from './text'

/**
 * @param error - what went wrong
 * @param hint - a line on what to do next
 *
 * @returns the error for a person: the message, its code — what to search for or branch on — and the hint.
 * The message is written out safely on one line, since it can quote a key path or a file's text — a line
 * break in a quoted value could otherwise fake a second `error` line; a list of input issues gets one
 * line per issue
 */
export const renderError = ({ code, message, details }: SerializedError, hint?: string): string => {
	const style = { stream: process.stderr }
	const issues = Array.isArray(details?.issues) ? details.issues.filter(isIssue) : []
	const text =
		issues.length === 0
			? printable(message)
			: [
					printable(message.split('\n')[0] ?? ''),
					...issues.map(
						issue => `  ${issue.path === '' ? '(input)' : printable(issue.path)}: ${printable(issue.message)}`
					)
				].join('\n')
	const lines = [`${styleText(['red', 'bold'], 'error', style)} ${text}`, styleText('dim', code, style)]
	return `${[...lines, ...(hint === undefined ? [] : [hint])].join('\n')}\n`
}

/**
 * @param value - one entry of an error's `details.issues`
 *
 * @returns whether it is an input issue: where in the input, and what is wrong there
 */
const isIssue = (value: unknown): value is { path: string; message: string } =>
	typeof value === 'object' &&
	value !== null &&
	'path' in value &&
	typeof value.path === 'string' &&
	'message' in value &&
	typeof value.message === 'string'
