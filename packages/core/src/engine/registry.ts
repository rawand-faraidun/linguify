import { errorCodes } from '@linguify/constants'
import type { EngineId } from '@linguify/types'
import { EngineError, UnexpectedError } from '../errors'
import type { Engine } from './types'

const engines = new Map<EngineId, Engine>()

/**
 * adds an engine to the registry; each engine calls this once, from its own folder
 *
 * @param engine - the engine to add
 */
export const registerEngine = (engine: Engine): void => {
	if (engines.has(engine.id)) {
		throw new UnexpectedError(`Engine "${engine.id}" is registered twice`, {
			code: errorCodes.unexpected,
			details: { engine: engine.id }
		})
	}
	engines.set(engine.id, engine)
}

/**
 * finds a registered engine
 *
 * @param id - the engine's id
 *
 * @returns the engine
 *
 * @throws {@link EngineError} `ENGINE_UNKNOWN` when no engine has that id
 */
export const getEngine = (id: EngineId): Engine => {
	const engine = engines.get(id)
	if (engine === undefined) {
		throw new EngineError(`Unknown engine "${id}". Available: ${[...engines.keys()].join(', ')}`, {
			code: errorCodes.engineUnknown,
			details: { engine: id, available: [...engines.keys()] }
		})
	}
	return engine
}

/**
 * @returns every registered engine, in registration order
 */
export const listEngines = (): Engine[] => [...engines.values()]
