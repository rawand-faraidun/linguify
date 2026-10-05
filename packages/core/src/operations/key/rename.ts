import { changeKinds, errorCodes, keyPathStates } from '@linguify/constants'
import { inspectKeyPath, readNode, removeNode, setNode, splitNamespace } from '@linguify/keys'
import type { Catalogue, Locale, OperationResult, RenameKeyInput, TranslationTree } from '@linguify/types'
import { ConflictError, NotFoundError } from '../../errors'
import type { OperationContext } from '../context'
import { requireKeyPath } from '../guards'
import { invalid, isWithin, moveDescriptions, notAssignable, parentOf, renameInPlace } from './shared'

/**
 * renames a key in every locale that has it, with its description
 *
 * @note a group moves whole, nested keys and their descriptions included. Within the same parent the
 * key keeps its place; moved to another parent it goes at the bottom of the new level, and the groups
 * it leaves empty are dropped — never a namespace. A description already at `to` with no key behind it
 * is replaced by the moved one. Another namespace must exist in some locale, unless
 * `keys.createNamespace` is on
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `key rename`'s input
 *
 * @returns the renamed catalogue, and the report
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for an unusable path, the same path twice, or a key
 * moved inside itself
 * @throws {@link NotFoundError} `KEY_NOT_FOUND` when no locale has `from`, `NAMESPACE_NOT_FOUND` when
 * `to`'s namespace does not exist and creating it is not allowed
 * @throws {@link ConflictError} `KEY_EXISTS` when any locale already has something at `to`,
 * `KEY_NOT_ASSIGNABLE` when `to` runs through a translation in a locale being renamed
 */
export const renameKey = (
	context: OperationContext,
	catalogue: Catalogue,
	{ from, to }: RenameKeyInput
): OperationResult => {
	const { config } = context
	requireKeyPath(context, from)
	requireKeyPath(context, to)
	if (from === to) throw invalid(`\`${from}\` is already the key's path`)
	if (isWithin(to, from)) throw invalid(`\`${to}\` is inside \`${from}\`; a key cannot move into itself`)

	const tree = (locale: Locale): TranslationTree => catalogue.locales[locale] ?? {}
	const holders = config.locales.filter(locale => readNode(tree(locale), from) !== undefined)
	if (holders.length === 0) {
		throw new NotFoundError(`\`${from}\` does not exist in any locale`, {
			code: errorCodes.keyNotFound,
			details: { path: from }
		})
	}
	const taken = config.locales.filter(locale => readNode(tree(locale), to) !== undefined)
	if (taken.length > 0) {
		throw new ConflictError(`\`${to}\` already exists in ${taken.map(locale => `\`${locale}\``).join(', ')}`, {
			code: errorCodes.keyExists,
			details: { path: to, locales: taken }
		})
	}
	if (context.namespaced) {
		const { namespace } = splitNamespace(to)
		const exists = config.locales.some(locale => Object.hasOwn(tree(locale), namespace))
		if (!exists && !config.keys.createNamespace) {
			throw new NotFoundError(
				`The namespace \`${namespace}\` does not exist. Create it first, or allow it to be created (\`keys.createNamespace\`)`,
				{ code: errorCodes.namespaceNotFound, details: { namespace, path: to } }
			)
		}
	}

	const sameParent = parentOf(from) === parentOf(to)
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => {
			const before = tree(locale)
			const node = readNode(before, from)
			if (node === undefined) return [locale, before]
			if (sameParent) return [locale, renameInPlace(before, from, to)]
			const without = removeNode(before, from, { keepTopLevel: context.namespaced })
			const inspection = inspectKeyPath(without, to)
			if (inspection.state === keyPathStates.blocked) throw notAssignable(to, [{ locale, ...inspection }])
			return [locale, setNode(without, to, node)]
		})
	)

	const descriptions = moveDescriptions(catalogue.descriptions, from, to)
	return {
		catalogue: { locales, descriptions },
		report: {
			changes: [
				{
					kind: changeKinds.renamed,
					path: to,
					from,
					locales: holders,
					...(descriptions === catalogue.descriptions ? {} : { description: true as const })
				}
			],
			warnings: []
		}
	}
}
