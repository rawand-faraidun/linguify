import { addKey, removeKeys, renameKey, setKey } from '@linguify/core'
import { addKeyInput, removeKeysInput, renameKeyInput, setKeyInput } from '../contracts'
import { router } from '../trpc'
import { mutation } from './mutation'

/**
 * `key add`, `key set`, `key rename`, `key remove`
 */
export const keyRouter = router({
	add: mutation(addKeyInput, addKey),
	set: mutation(setKeyInput, setKey),
	rename: mutation(renameKeyInput, renameKey),
	remove: mutation(removeKeysInput, removeKeys)
})
