import { fileStructures } from '@linguify/constants'
import { registerEngine } from '../../engine'
import { jsonOptions } from './options'

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
	options: jsonOptions
})
