import { errorCodes, keyPathProblems, keySeparator, reservedKeySegments } from '@linguify/constants'
import { findKeyPathProblem, splitKeyPath } from '@linguify/keys'
import type { KeyPath, KeyPathProblem, Locale, NamespaceName } from '@linguify/types'
import { NotFoundError, ValidationError } from '../errors'
import type { OperationContext } from './context'

/**
 * why each kind of unusable key path is refused
 */
const keyPathReasons: Record<KeyPathProblem, string> = {
	[keyPathProblems.empty]: 'it is empty',
	[keyPathProblems.emptySegment]: 'it has an empty segment — two dots in a row, or one at either end',
	[keyPathProblems.reservedSegment]: `a segment is a reserved name (${reservedKeySegments.map(name => `\`${name}\``).join(', ')})`
}

/**
 * makes sure a locale is one the config lists
 *
 * @param context - the operation context
 * @param locale - the locale an input names
 *
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN`, listing the configured locales
 */
export const requireLocale = ({ config }: OperationContext, locale: Locale): void => {
	if (config.locales.includes(locale)) return
	throw new NotFoundError(
		`\`${locale}\` is not a configured locale. The config lists ${config.locales.map(code => `\`${code}\``).join(', ')}`,
		{ code: errorCodes.localeUnknown, details: { locale, locales: config.locales } }
	)
}

/**
 * makes sure the project's keys start with a namespace
 *
 * @param context - the operation context
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED`
 */
export const requireNamespaces = ({ namespaced }: OperationContext): void => {
	if (namespaced) return
	throw new ValidationError('Namespaces are off in this project: the first segment of a key is not a namespace', {
		code: errorCodes.namespacesDisabled
	})
}

/**
 * makes sure descriptions are on before an input sets one
 *
 * @param context - the operation context
 *
 * @throws {@link ValidationError} `DESCRIPTIONS_DISABLED`
 */
export const requireDescriptions = ({ config }: OperationContext): void => {
	if (config.description.enabled) return
	throw new ValidationError('Descriptions are off in this project. Turn `description` on in the config to set one', {
		code: errorCodes.descriptionsDisabled
	})
}

/**
 * makes sure a name can be a namespace — namespaces are on, and the name is one usable key segment
 *
 * @param context - the operation context
 * @param name - the namespace name an input gives
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED`, or `INVALID_INPUT` saying why the name cannot
 * be used
 */
export const requireNamespaceName = (context: OperationContext, name: NamespaceName): void => {
	requireNamespaces(context)
	const problem = findKeyPathProblem(name)
	const reason =
		problem !== undefined
			? keyPathReasons[problem]
			: splitKeyPath(name).length > 1
				? `it contains \`${keySeparator}\`, which separates the namespace from the key`
				: undefined
	if (reason === undefined) return
	throw new ValidationError(`\`${name}\` cannot be a namespace: ${reason}`, {
		code: errorCodes.invalidInput,
		details: { namespace: name }
	})
}

/**
 * makes sure a key path can name a translation in this project
 *
 * @note with namespaces on, a path needs a namespace and a key; an engine that cannot nest allows no
 * further segments
 *
 * @param context - the operation context
 * @param path - the key path an input names
 *
 * @throws {@link ValidationError} `INVALID_INPUT`, saying why
 */
export const requireKeyPath = ({ namespaced, capabilities }: OperationContext, path: KeyPath): void => {
	const problem = findKeyPathProblem(path)
	const segments = splitKeyPath(path)
	const reason =
		problem !== undefined
			? keyPathReasons[problem]
			: namespaced && segments.length < 2
				? 'it names only a namespace — a key is the namespace, then the key: `common.save`'
				: !capabilities.nesting && segments.length > (namespaced ? 2 : 1)
					? "this project's format cannot nest keys"
					: undefined
	if (reason === undefined) return
	throw new ValidationError(`\`${path}\` is not a usable key path: ${reason}`, {
		code: errorCodes.invalidInput,
		details: { path }
	})
}
