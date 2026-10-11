import { cliFlags } from '@linguify/constants'
import type { Command } from 'commander'

/**
 * the flags every command takes
 */
export type GlobalOptions = {
	config?: string
	cwd?: string
	json?: boolean
}

/**
 * adds the flags every command takes, read wherever they appear — `linguify --json config` and
 * `linguify config --json` are the same
 *
 * @param program - the root command
 *
 * @returns the root command
 */
export const addGlobalOptions = (program: Command): Command =>
	program
		.option(cliFlags.config.flags, cliFlags.config.description)
		.option(cliFlags.cwd.flags, cliFlags.cwd.description)
		.option(cliFlags.json.flags, cliFlags.json.description)

/**
 * @param command - the running command
 *
 * @returns the global flags as given
 */
export const readGlobalOptions = (command: Command): GlobalOptions => command.optsWithGlobals<GlobalOptions>()
