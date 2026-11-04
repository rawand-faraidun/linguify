import type { MutationResult } from '@linguify/api'
import { appName, cliFlags, exitCodes } from '@linguify/constants'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { projectFolder } from '../lib/options'
import { respond } from '../lib/output'
import { dim, shownPath } from '../lib/render/text'

/**
 * `linguify format`
 *
 * @note `--check` fails through the exit code alone, under `--json` too: the result is still
 * `{ ok: true, data }`, since the check itself worked, and `data.plan.write` lists the files that need
 * formatting — CI gates on the exit code either way
 */
export const formatCommand = new Command('format')
	.description("Sort every locale's keys and lay out every file the same way — the only command that sorts")
	.option(cliFlags.check.flags, cliFlags.check.description)
	.action((options: { check?: boolean }, command: Command) =>
		respond(
			command,
			async () => {
				const result = await callerFor(command).format({ dryRun: options.check === true })
				if (options.check === true && result.plan.write.length > 0) process.exitCode = exitCodes.failure
				return result
			},
			result => renderFormat(result, projectFolder(command))
		)
	)

/**
 * @param result - what `format` did, or under `--check` would do
 * @param cwd - the working folder, which file paths are shown from
 *
 * @returns each file formatted — or, under `--check`, each that needs it — or that every file already is
 */
const renderFormat = ({ plan, applied }: MutationResult, cwd: string): string => {
	if (plan.write.length === 0) return `${dim('Every file is formatted')}\n`
	const verb = applied ? 'formatted' : 'needs formatting'
	const files = plan.write.map(({ file }) => `${dim(verb)}  ${shownPath(cwd, file)}`)
	const closing = applied
		? []
		: ['', dim(`Run \`${appName} ${formatCommand.name()}\` to format ${plan.write.length === 1 ? 'it' : 'them'}`)]
	return `${[...files, ...closing].join('\n')}\n`
}
