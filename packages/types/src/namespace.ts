import type { NamespaceName } from './identifiers'

/**
 * `namespace add`'s input
 */
export type AddNamespaceInput = {
	name: NamespaceName
}

/**
 * `namespace rename`'s input — renames it in every locale
 */
export type RenameNamespaceInput = {
	from: NamespaceName
	to: NamespaceName
}

/**
 * `namespace remove`'s input — removes the namespace and every key in it, from every locale
 */
export type RemoveNamespaceInput = {
	name: NamespaceName
}
