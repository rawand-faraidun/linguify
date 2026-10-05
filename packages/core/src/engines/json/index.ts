import { fileStructures } from '@linguify/constants'
import { registerEngine } from '../../engine'
import { isJsonNamespaced, jsonOptions } from './options'
import { readJson } from './read'
import { serializeJson } from './serialize'

/**
 * the JSON engine's id, as written in a config's `engine`
 */
export const jsonEngineId = 'json'

registerEngine({
	id: jsonEngineId,
	capabilities: {
		nesting: true,
		namespaces: true,
		fileStructures: [fileStructures.single, fileStructures.multi]
	},
	options: jsonOptions,
	namespaced: isJsonNamespaced,
	read: readJson,
	serialize: serializeJson
})
