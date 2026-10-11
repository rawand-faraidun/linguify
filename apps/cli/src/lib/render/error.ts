import { styleText } from 'node:util'
import type { SerializedError } from '@linguify/types'

/**
 * @param error - what went wrong
 * @param hint - a line on what to do next
 *
 * @returns the error for a person: the message, its code — what to search for or branch on — and the hint
 */
export const renderError = ({ code, message }: SerializedError, hint?: string): string => {
	const style = { stream: process.stderr }
	const lines = [`${styleText(['red', 'bold'], 'error', style)} ${message}`, styleText('dim', code, style)]
	return `${[...lines, ...(hint === undefined ? [] : [hint])].join('\n')}\n`
}
