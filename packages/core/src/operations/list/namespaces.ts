import { localeOrder, namespacesIn } from '@linguify/keys'
import type { Catalogue, NamespaceName } from '@linguify/types'
import type { OperationContext } from '../context'
import { requireNamespaces } from '../guards'

/**
 * lists the namespaces
 *
 * @note an empty namespace is listed too — it exists, it only has no keys yet. The order is the studio's:
 * both come from `namespacesIn`
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
	return namespacesIn(catalogue, localeOrder(context.config))
}
