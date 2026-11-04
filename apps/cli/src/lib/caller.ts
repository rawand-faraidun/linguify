import { createCaller } from '@linguify/api'
import type { ConfigInput } from '@linguify/types'
import type { Command } from 'commander'
import { projectFolder, readGlobalOptions } from './options'

/**
 * calls the API in-process for the project the global flags point at — the same procedures the studio
 * and the extension call
 *
 * @param command - the running command
 * @param flag - the config values the command's own flags set, as the flag layer — only flags typed on
 * the command line, so a flag never overrides the config with a default
 *
 * @returns the caller
 */
export const callerFor = (command: Command, flag?: ConfigInput) => {
	return createCaller({
		cwd: projectFolder(command),
		config: readGlobalOptions(command).config,
		...(flag === undefined ? {} : { flag })
	})
}
