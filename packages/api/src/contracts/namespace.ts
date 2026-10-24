import { z } from 'zod'
import { namespaceName, newNamespaceName } from './shared'

/**
 * `namespace add`
 */
export const addNamespaceInput = z.strictObject({
	name: newNamespaceName.describe('The new namespace; an existing one is a warning and changes nothing')
})

/**
 * `namespace rename`
 */
export const renameNamespaceInput = z.strictObject({
	from: namespaceName.describe('The namespace to rename'),
	to: newNamespaceName.describe('Its new name')
})

/**
 * `namespace remove`
 */
export const removeNamespaceInput = z.strictObject({
	name: namespaceName.describe('The namespace to remove, with every key in it')
})
