#!/usr/bin/env node
import { appDescription, appName, cliFlags, cliHelpCommand } from '@linguify/constants'
import { Command } from 'commander'
import packageJson from '../package.json' with { type: 'json' }
import { configCommand } from './commands/config'
import { initCommand } from './commands/init'
import { addGlobalOptions } from './lib/options'
import { respondToParseError } from './lib/output'

/**
 * whether `--json` was asked for — read from the raw arguments, since a parse error comes before the
 * flags are known
 */
const json = process.argv.includes(cliFlags.json.flags)

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

for (const command of [initCommand, configCommand]) program.addCommand(command.copyInheritedSettings(program))

try {
	await program.parseAsync()
} catch (error) {
	respondToParseError(error, json)
}
