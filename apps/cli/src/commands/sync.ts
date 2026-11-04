import { mutationOptions, syncInput } from '@linguify/api'
import { cliFlags, cliInputFlags } from '@linguify/constants'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { helpFor, projectFolder } from '../lib/options'
import { respond } from '../lib/output'
import { renderMutation } from '../lib/render/mutation'

/**
 * `linguify sync`
 *
 * @note `--remove-unused` reaches the API only when it was typed: commander's value alone cannot tell
 * "not given" from a default, and a default would override `sync.removeUnused` in the config
 */
export const syncCommand = new Command('sync')
	.description(
		'Bring every other locale in line with the default: add the keys they lack and, with --remove-unused, remove the ones the default no longer has'
	)
	.option(cliInputFlags.removeUnused, helpFor(syncInput.shape.removeUnused))
	.option(cliFlags.keepUnused.flags, cliFlags.keepUnused.description)
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((options: { removeUnused?: boolean; dryRun?: boolean }, command: Command) =>
		respond(
			command,
			() =>
				callerFor(command).sync({
					...(command.getOptionValueSource('removeUnused') === 'cli' ? { removeUnused: options.removeUnused } : {}),
					dryRun: options.dryRun
				}),
			result => renderMutation(result, projectFolder(command))
		)
	)
