import type { Config, EngineCapabilities } from '@linguify/types'
import { getEngine } from '../engine'

/**
 * what every operation is told about the project
 */
export type OperationContext = {
	config: Config

	/**
	 * what the config's engine can express
	 */
	capabilities: EngineCapabilities

	/**
	 * whether the first segment of every key path is a namespace
	 */
	namespaced: boolean

	/**
	 * whether each namespace is a file of its own, so its name must be one
	 */
	namespaceFiles: boolean
}

/**
 * gathers what operations need to know about a project
 *
 * @note whether keys are namespaced is the engine's answer, from its own options, so no operation
 * reads an engine's options
 *
 * @param config - the resolved config
 *
 * @returns the operation context
 */
export const createOperationContext = (config: Config): OperationContext => {
	const engine = getEngine(config.engine)
	return {
		config,
		capabilities: engine.capabilities,
		namespaced: engine.capabilities.namespaces && engine.namespaced(config.options),
		namespaceFiles: engine.capabilities.namespaces && engine.namespaceFiles(config.options)
	}
}
