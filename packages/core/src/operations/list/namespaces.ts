import type { Catalogue, NamespaceName } from '@linguify/types'
import { localeOrder, type OperationContext } from '../context'
import { requireNamespaces } from '../guards'

/**
 * lists the namespaces
 *
 * @note an empty namespace is listed too — it exists, it only has no keys yet
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 *
 * @returns every namespace any locale has: the default locale's in its order, then the ones only other
 * locales have, in config order
 *
 * @throws {@link ValidationError} `NAMESPACES_DISABLED` when the project's keys have no namespace
 */
export const listNamespaces = (context: OperationContext, catalogue: Catalogue): NamespaceName[] => {
	requireNamespaces(context)
	return [...new Set(localeOrder(context.config).flatMap(locale => Object.keys(catalogue.locales[locale] ?? {})))]
}
