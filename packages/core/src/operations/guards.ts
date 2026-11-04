import { errorCodes, keyPathProblemText } from '@linguify/constants'
import {
	findKeyPathProblem,
	findNamespaceFileProblem,
	findNamespaceNameProblem,
	findProjectKeyPathProblem,
	hasNamespace,
	namespacesIn
} from '@linguify/keys'
import type { Catalogue, KeyPath, Locale, NamespaceName } from '@linguify/types'
import { NotFoundError, ValidationError } from '../errors'
import type { OperationContext } from './context'

/**
 * says why a key path cannot be used in any project — the rules that need no config
 *
 * @note `requireKeyPath` adds the ones that depend on the project; the API's contracts use this one, so
 * a bad path is refused before any project is read, with the same words
 *
 * @param path - a key path
 *
 * @returns the reason, or `undefined` when the path is usable
 */
export const findKeyPathReason = (path: KeyPath): string | undefined => {
	const problem = findKeyPathProblem(path)
	return problem === undefined ? undefined : keyPathProblemText[problem]
}

/**
 * says why a name cannot be a namespace in any project
 *
 * @param name - a namespace name
 *
 * @returns the reason, or `undefined` when the name is usable
 */
export const findNamespaceNameReason = (name: NamespaceName): string | undefined => {
	const problem = findNamespaceNameProblem(name)
	return problem === undefined ? undefined : keyPathProblemText[problem]
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
	const reason = findNamespaceNameReason(name)
	if (reason === undefined) return
	throw new ValidationError(`\`${name}\` cannot be a namespace. ${reason}`, {
		code: errorCodes.invalidInput,
		details: { namespace: name }
	})
}

/**
 * makes sure a namespace a change creates can be a file, where each namespace is one — the studio checks a
 * name with the same rule before it is sent
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param name - the namespace the change creates, or renames another to
 * @param from - the namespace being renamed, which the new name may differ from only in case
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for a name no file can have, or one differing from another
 * namespace only in case
 */
export const requireNamespaceFile = (
	{ namespaceFiles }: OperationContext,
	catalogue: Catalogue,
	name: NamespaceName,
	from?: NamespaceName
): void => {
	if (!namespaceFiles || hasNamespace(catalogue, name)) return
	const others = namespacesIn(catalogue).filter(namespace => namespace !== from)
	const problem = findNamespaceFileProblem(name, others)
	if (problem === undefined) return
	throw new ValidationError(`\`${name}\` cannot be a namespace. ${keyPathProblemText[problem]}`, {
		code: errorCodes.invalidInput,
		details: { namespace: name }
	})
}

/**
 * makes sure a key path can name a translation in this project
 *
 * @note `findProjectKeyPathProblem`'s rules — the same the studio checks a new key with before it is sent
 *
 * @param context - the operation context
 * @param path - the key path an input names
 *
 * @throws {@link ValidationError} `INVALID_INPUT`, saying why
 */
export const requireKeyPath = ({ namespaced, capabilities }: OperationContext, path: KeyPath): void => {
	const problem = findProjectKeyPathProblem(path, { namespaced, nesting: capabilities.nesting })
	if (problem === undefined) return
	throw new ValidationError(`\`${path}\` is not a usable key path. ${keyPathProblemText[problem]}`, {
		code: errorCodes.invalidInput,
		details: { path }
	})
}
