import { resolve } from 'node:path'
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

/**
 * @param command - the running command
 *
 * @returns the folder the command works in, absolute: `--cwd` when given, else where it was started
 */
export const projectFolder = (command: Command): string => resolve(readGlobalOptions(command).cwd ?? process.cwd())

/**
 * @param flags - a flag's definition — `-y, --yes`
 *
 * @returns its long form, as a message names it — `--yes`
 */
export const longFlag = (flags: string): string => flags.split(' ').find(part => part.startsWith('--')) ?? flags
