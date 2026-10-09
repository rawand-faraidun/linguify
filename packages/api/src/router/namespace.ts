import { addNamespace, removeNamespace, renameNamespace } from '@linguify/core'
import { addNamespaceInput, removeNamespaceInput, renameNamespaceInput } from '../contracts'
import { router } from '../trpc'
import { mutation } from './mutation'

/**
 * `namespace add`, `namespace rename`, `namespace remove`
 */
export const namespaceRouter = router({
	add: mutation(addNamespaceInput, addNamespace),
	rename: mutation(renameNamespaceInput, renameNamespace),
	remove: mutation(removeNamespaceInput, removeNamespace)
})
