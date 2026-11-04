import { configFileName, errorCodes } from '@linguify/constants'
import { initProject, ValidationError } from '@linguify/core'
import { initInput } from '../contracts'
import { procedure } from '../trpc'

/**
 * `init` — starts a project in the working folder; the one procedure that needs no config, so it is
 * not a project procedure
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for a config file named in the context: `init` writes
 * the config, always under its own name, so a named one would silently be ignored
 */
export const initProcedure = procedure.input(initInput.optional()).mutation(({ ctx, input = {} }) => {
	if (ctx.config !== undefined) {
		throw new ValidationError(
			`init always writes ${configFileName} in the working folder, so it takes no config file — choose the folder instead`,
			{ code: errorCodes.invalidInput, details: { config: ctx.config } }
		)
	}
	return initProject(ctx.cwd, input)
})
