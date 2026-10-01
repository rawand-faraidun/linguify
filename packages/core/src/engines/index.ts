import { defaultEngineId, errorCodes } from '@linguify/constants'
import { listEngines } from '../engine'
import { UnexpectedError } from '../errors'
import './json'

if (!listEngines().some(engine => engine.id === defaultEngineId)) {
	throw new UnexpectedError(`The default engine "${defaultEngineId}" is not registered`, {
		code: errorCodes.unexpected,
		details: { engine: defaultEngineId }
	})
}
