import type { Config, EngineCapabilities, Locale } from '@linguify/types'
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
		namespaced: engine.capabilities.namespaces && engine.namespaced(config.options)
	}
}

/**
 * @param config - the resolved config
 *
 * @returns every configured locale, the default first and the rest in config order
 */
export const localeOrder = (config: Config): Locale[] => [
	config.default,
	...config.locales.filter(locale => locale !== config.default)
]
