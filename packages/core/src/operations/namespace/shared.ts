import { errorCodes } from '@linguify/constants'
import type { Catalogue, Locale, NamespaceName } from '@linguify/types'
import { NotFoundError } from '../../errors'
import type { OperationContext } from '../context'

/**
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param name - a namespace name
 *
 * @returns the locales that have the namespace, in config order
 */
export const findNamespaceHolders = (
	{ config }: OperationContext,
	catalogue: Catalogue,
	name: NamespaceName
): Locale[] => config.locales.filter(locale => Object.hasOwn(catalogue.locales[locale] ?? {}, name))

/**
 * @param name - the namespace no locale has
 *
 * @returns the error to throw
 */
export const namespaceNotFound = (name: NamespaceName): NotFoundError =>
	new NotFoundError(`The namespace \`${name}\` does not exist in any locale`, {
		code: errorCodes.namespaceNotFound,
		details: { namespace: name }
	})
