#!/usr/bin/env node
import { appDescription, appName, cliFlags, cliHelpCommand, fileErrorCodes } from '@linguify/constants'
import { Command } from 'commander'
import packageJson from '../package.json' with { type: 'json' }
import { configCommand } from './commands/config'
import { diffCommand } from './commands/diff'
import { formatCommand } from './commands/format'
import { initCommand } from './commands/init'
import { keyCommand } from './commands/key'
import { listCommand } from './commands/list'
import { namespaceCommand } from './commands/namespace'
import { syncCommand } from './commands/sync'
import { addGlobalOptions } from './lib/options'
import { respondToParseError } from './lib/output'

/**
 * whether `--json` was asked for — read from the raw arguments, since a parse error comes before the
 * flags are known
 */
const json = process.argv.includes(cliFlags.json.flags)

/**
 * a reader that stops reading early — `linguify list keys | head -1`, or a pipe that has already closed —
 * is not an error: what is left goes nowhere, quietly, instead of ending in a stack trace
 */
process.stdout.on('error', error => {
	if (!('code' in error) || error.code !== fileErrorCodes.brokenPipe) throw error
})

/**
 * the root command; every subcommand registers onto it and inherits its settings
 *
 * @note commander's own error output is silenced: every error, its parse errors included, is printed
 * once, by `respondToParseError` or `respond`, in the same form. Under `--json` the help it prints when
 * no command is given is silenced too, so stdout still holds exactly one object
 */
const program = addGlobalOptions(
	new Command(appName)
		.description(appDescription)
		.version(packageJson.version, cliFlags.version.flags, cliFlags.version.description)
		.helpOption(cliFlags.help.flags, cliFlags.help.description)
		.helpCommand(cliHelpCommand.name, cliHelpCommand.description)
		.configureHelp({ showGlobalOptions: true })
		.exitOverride()
		.configureOutput(json ? { outputError: () => {}, writeErr: () => {} } : { outputError: () => {} })
)

/**
 * gives a command, and every command under it, the root's settings — commander copies them only to
 * commands it creates itself
 *
 * @param command - a command
 * @param parent - the command it goes under
 *
 * @returns the command
 */
const inherit = (command: Command, parent: Command): Command => {
	command.copyInheritedSettings(parent)
	for (const child of command.commands) inherit(child, command)
	return command
}

for (const command of [
	initCommand,
	configCommand,
	keyCommand,
	namespaceCommand,
	syncCommand,
	formatCommand,
	diffCommand,
	listCommand
])
	program.addCommand(inherit(command, program))

try {
	await program.parseAsync()
} catch (error) {
	respondToParseError(error, json)
}
