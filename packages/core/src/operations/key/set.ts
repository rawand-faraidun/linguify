import { changeKinds, errorCodes, keyPathStates } from '@linguify/constants'
import { findConflicts, findDuplicate, inspectKeyPath, readTranslation, setTranslation } from '@linguify/keys'
import type { Catalogue, Descriptions, KeyPath, Locale, TranslationTree } from '@linguify/types'
import { NotFoundError } from '../../errors'
import { getOwn } from '../../utils'
import type { OperationContext } from '../context'
import { requireDescriptions, requireKeyPath } from '../guards'
import type { OperationResult } from '../report'
import { collectGivenText, invalid, notAssignable } from './shared'

/**
 * `key set`'s input — changes an existing key and never creates one
 */
export type SetKeyInput = {
	path: KeyPath

	/**
	 * the default locale's new text
	 */
	value?: string | undefined

	/**
	 * other locales' new text
	 */
	translations?: Record<Locale, string> | undefined

	/**
	 * apply `value` to every locale, not only the default
	 */
	all?: boolean | undefined

	description?: string | undefined
}

/**
 * changes an existing key's text or description
 *
 * @note never creates a key: one no locale has is an error. A locale that lacks the key gets it when
 * `translations` names that locale, which is how a missing translation is filled in. With `all`,
 * `value` goes to every locale, and a locale `translations` names keeps its own text. An empty
 * `description` removes the description. Only what actually changes is reported
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `key set`'s input
 *
 * @returns the changed catalogue, and the report
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for an unusable path, nothing to set, `all` without a
 * value or the default's text given twice; `DESCRIPTIONS_DISABLED` for a description while
 * descriptions are off
 * @throws {@link NotFoundError} `KEY_NOT_FOUND` when no locale has the key, `LOCALE_UNKNOWN` for a
 * translation in an unknown locale
 * @throws {@link ConflictError} `KEY_NOT_ASSIGNABLE` when a locale being set has nested keys at the path,
 * or a translation on the way to it
 */
export const setKey = (context: OperationContext, catalogue: Catalogue, input: SetKeyInput): OperationResult => {
	const { config } = context
	const { path, value, description } = input
	requireKeyPath(context, path)
	const given = collectGivenText(context, input)
	if (input.all === true) {
		if (value === undefined) throw invalid('There is no value to give every locale')
		for (const locale of config.locales) if (!given.has(locale)) given.set(locale, value)
	}
	if (description !== undefined) requireDescriptions(context)
	if (given.size === 0 && description === undefined)
		throw invalid('Nothing to set: give a value, a translation or a description')

	if (findDuplicate(catalogue, path).length === 0) {
		const group = Object.values(catalogue.locales).some(
			tree => inspectKeyPath(tree, path).state === keyPathStates.group
		)
		const problem = group
			? 'holds nested keys, not a translation — set one of them'
			: 'does not exist in any locale. `key add` creates keys'
		throw new NotFoundError(`\`${path}\` ${problem}`, { code: errorCodes.keyNotFound, details: { path } })
	}
	const [conflict, ...conflicts] = findConflicts(catalogue, path).filter(({ locale }) => given.has(locale))
	if (conflict !== undefined) throw notAssignable(path, [conflict, ...conflicts])

	const changed = config.locales.filter(locale => {
		const text = given.get(locale)
		return text !== undefined && readTranslation(catalogue.locales[locale] ?? {}, path) !== text
	})
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => {
			const tree = catalogue.locales[locale] ?? {}
			const text = given.get(locale)
			return [locale, text !== undefined && changed.includes(locale) ? setTranslation(tree, path, text) : tree]
		})
	)

	const before = getOwn(catalogue.descriptions, path)
	const after = description === undefined ? before : description === '' ? undefined : description
	const describedAgain = before !== after
	const descriptions: Descriptions = !describedAgain
		? catalogue.descriptions
		: after === undefined
			? Object.fromEntries(Object.entries(catalogue.descriptions).filter(([key]) => key !== path))
			: { ...catalogue.descriptions, [path]: after }

	return {
		catalogue: { locales, descriptions },
		report: {
			changes:
				changed.length > 0 || describedAgain
					? [
							{
								kind: changeKinds.updated,
								path,
								locales: changed,
								...(describedAgain ? { description: true as const } : {})
							}
						]
					: [],
			warnings: []
		}
	}
}
