import { errorCodes, keyPathStates } from '@linguify/constants'
import { isWithin, joinKeyPath, movePath, readNode, setNode, splitKeyPath } from '@linguify/keys'
import type { Descriptions, KeyConflict, KeyPath, Locale, TranslationTree } from '@linguify/types'
import { ConflictError, ValidationError } from '../../errors'
import type { OperationContext } from '../context'
import { requireLocale } from '../guards'

/**
 * the text an input gives: `value` for the default locale, `translations` for any locale
 */
type GivenText = {
	value?: string | undefined
	translations?: Record<Locale, string> | undefined
}

/**
 * collects the text an input gives each locale
 *
 * @param context - the operation context
 * @param input - the input's `value` and `translations`
 *
 * @returns each locale the input names, with its text
 *
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN` for a translation in a locale the config does not list
 * @throws {@link ValidationError} `INVALID_INPUT` when the default locale's text is given twice
 */
export const collectGivenText = (
	context: OperationContext,
	{ value, translations = {} }: GivenText
): Map<Locale, string> => {
	const given = new Map(Object.entries(translations))
	for (const locale of given.keys()) requireLocale(context, locale)
	if (value === undefined) return given

	const { default: defaultLocale } = context.config
	if (given.has(defaultLocale)) {
		throw new ValidationError(
			`The default locale's text is given twice: as the value, and as the translation for \`${defaultLocale}\``,
			{ code: errorCodes.invalidInput, details: { locale: defaultLocale } }
		)
	}
	return new Map([[defaultLocale, value], ...given])
}

/**
 * @param message - what is wrong with the input
 *
 * @returns the error to throw
 */
export const invalid = (message: string): ValidationError =>
	new ValidationError(message, { code: errorCodes.invalidInput })

/**
 * @param path - the key path that cannot take a translation
 * @param conflicts - every locale where it cannot, from `findConflicts`
 *
 * @returns the error to throw, explaining the first conflict
 */
export const notAssignable = (path: KeyPath, [first, ...rest]: [KeyConflict, ...KeyConflict[]]): ConflictError => {
	const problem =
		first.state === keyPathStates.group
			? `\`${path}\` holds nested keys in \`${first.locale}\`; a translation there would replace them`
			: `\`${path}\` runs through \`${first.at}\`, a translation in \`${first.locale}\`, which cannot hold nested keys`
	return new ConflictError(problem, {
		code: errorCodes.keyNotAssignable,
		details: { path, conflicts: [first, ...rest] }
	})
}

/**
 * moves the descriptions of a key and of every key nested under it to a new path
 *
 * @note each description keeps its place in the file
 *
 * @param descriptions - the descriptions
 * @param from - the old key path
 * @param to - the new key path
 *
 * @returns the descriptions after the move — the same object when none moved
 */
export const moveDescriptions = (descriptions: Descriptions, from: KeyPath, to: KeyPath): Descriptions => {
	const entries = Object.entries(descriptions)
	if (!entries.some(([key]) => isWithin(key, from))) return descriptions
	return Object.fromEntries(entries.map(([key, text]) => [movePath(key, from, to), text]))
}

/**
 * drops the descriptions of a key and of every key nested under it
 *
 * @param descriptions - the descriptions
 * @param path - the removed key path
 *
 * @returns the remaining descriptions — the same object when none was dropped
 */
export const dropDescriptions = (descriptions: Descriptions, path: KeyPath): Descriptions => {
	const entries = Object.entries(descriptions)
	if (!entries.some(([key]) => isWithin(key, path))) return descriptions
	return Object.fromEntries(entries.filter(([key]) => !isWithin(key, path)))
}

/**
 * @param path - a key path
 *
 * @returns the path of the group holding it — `''` at the top level
 */
export const parentOf = (path: KeyPath): KeyPath => joinKeyPath(splitKeyPath(path).slice(0, -1))

/**
 * renames the last segment of a key path where it stands, keeping its place among its siblings
 *
 * @param tree - one locale's tree, which has `from`
 * @param from - the old key path
 * @param to - the new key path, under the same parent
 *
 * @returns a new tree
 */
export const renameInPlace = (tree: TranslationTree, from: KeyPath, to: KeyPath): TranslationTree => {
	const parent = parentOf(from)
	const group = parent === '' ? tree : readNode(tree, parent)
	if (typeof group !== 'object') return tree
	const [oldName, newName] = [from, to].map(path => splitKeyPath(path).at(-1) ?? '')
	const renamed = Object.fromEntries(
		Object.entries(group).map(([key, node]) => [key === oldName ? newName : key, node])
	)
	return parent === '' ? renamed : setNode(tree, parent, renamed)
}
