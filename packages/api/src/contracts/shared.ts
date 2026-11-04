import { keyPathProblemText, localeCodePattern, reservedKeySegments } from '@linguify/constants'
import { findKeyPathReason, findNamespaceNameReason } from '@linguify/core'
import { findNewNameProblem } from '@linguify/keys'
import { z } from 'zod'

/**
 * a full dotted key path — refused here when no project could use it; `key add` and the rest check
 * what depends on the project
 */
export const keyPath = z.string().superRefine((path, context) => {
	const reason = findKeyPathReason(path)
	if (reason !== undefined) context.addIssue({ code: 'custom', message: `Not a usable key path. ${reason}` })
})

/**
 * a key path a change creates — never one holding a character a terminal acts on; an existing key with
 * one stays reachable through {@link keyPath}, so it can still be renamed or removed
 */
export const newKeyPath = keyPath.superRefine((path, context) => {
	const problem = findNewNameProblem(path)
	if (problem !== undefined)
		context.addIssue({ code: 'custom', message: `Not a usable key path. ${keyPathProblemText[problem]}` })
})

/**
 * a namespace name — one usable key segment
 */
export const namespaceName = z.string().superRefine((name, context) => {
	const reason = findNamespaceNameReason(name)
	if (reason !== undefined) context.addIssue({ code: 'custom', message: `Not a usable namespace name. ${reason}` })
})

/**
 * a locale code, as the config would accept it; whether the project lists it is the operation's check
 *
 * @note reserved names are refused here, not left to the operation: as a `translations` key, zod would
 * assign `__proto__` and silently drop it
 */
export const locale = z
	.string()
	.regex(localeCodePattern, 'A locale code may only contain letters, digits, `-` and `_` — `en`, `ckb`')
	.refine(code => !reservedKeySegments.includes(code), 'Not a locale code: this name is reserved')

/**
 * text per locale
 *
 * @note the keys are checked on the raw input, before the record: zod's record skips a `__proto__` key
 * without a word, and reports any other bad key only as "Invalid key in record". Starting from a typed
 * `custom` keeps the input typed for callers, where a `preprocess` would make it `unknown`
 */
export const translations = z
	.custom<Record<string, string>>()
	.superRefine((value, context) => {
		if (typeof value !== 'object' || value === null) return
		for (const key of Object.keys(value)) {
			const result = locale.safeParse(key)
			for (const issue of result.success ? [] : result.error.issues) {
				context.addIssue({ code: 'custom', message: issue.message, path: [key], input: key })
			}
		}
	})
	.pipe(z.record(z.string(), z.string()))

/**
 * what every mutation accepts on top of its own input
 */
export const mutationOptions = z.strictObject({
	dryRun: z.boolean().optional().describe('Work out what would change, and write nothing'),
	expectedRevision: z
		.string()
		.min(1)
		.optional()
		.describe('The revision the caller last read; the write is refused if the files changed since')
})

/**
 * a namespace name a change creates — never one holding a character a terminal acts on
 */
export const newNamespaceName = namespaceName.superRefine((name, context) => {
	const problem = findNewNameProblem(name)
	if (problem !== undefined)
		context.addIssue({ code: 'custom', message: `Not a usable namespace name. ${keyPathProblemText[problem]}` })
})
