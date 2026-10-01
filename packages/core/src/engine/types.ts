import type { EngineCapabilities, EngineId, EngineOptions } from '@linguify/types'
import type { z } from 'zod'

/**
 * a format linguify can read and write translation files in
 *
 * @note only the declaration so far; reading and writing join it with the engine IO
 */
export type Engine = {
	id: EngineId

	/**
	 * what the format can express; operations and every surface consult these instead of branching on
	 * an engine's id
	 */
	capabilities: EngineCapabilities

	/**
	 * the engine's `options` schema — strict, with every field described and defaulted
	 */
	options: z.ZodType<EngineOptions>
}
