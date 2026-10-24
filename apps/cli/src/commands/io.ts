import { exportInput, importInput, mutationOptions } from '@linguify/api'
import { cliDryRunNote, cliInputFlags, ioFormats } from '@linguify/constants'
import type { IoFormat } from '@linguify/types'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { helpFor, projectFolder } from '../lib/options'
import { respond } from '../lib/output'
import { renderMutation } from '../lib/render/mutation'
import { counted, dim, shownPath } from '../lib/render/text'

/**
 * every format a table can be written in, for the help — `csv, tsv, json or xlsx`
 */
const formatList = Object.values(ioFormats)
	.join(', ')
	.replace(/, ([^,]+)$/, ' or $1')

/**
 * the options `export` and `import` share
 */
type IoOptions = {
	format?: IoFormat
	path?: string
	dryRun?: boolean
}

/**
 * `linguify export`
 */
export const exportCommand = new Command('export')
	.description(`Write every key, in every locale, to a ${formatList} file`)
	.option(cliInputFlags.format, helpFor(exportInput.shape.format))
	.option(cliInputFlags.path, helpFor(exportInput.shape.path))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((options: IoOptions, command: Command) =>
		respond(
			command,
			() => callerFor(command).export({ format: options.format, path: options.path, dryRun: options.dryRun }),
			({ path, rows, written }) => {
				const where = shownPath(projectFolder(command), path)
				const what = `${counted(rows, 'key')} to ${where}`
				return written ? `${dim('exported')}  ${what}\n` : `${dim('would export')}  ${what}\n\n${dim(cliDryRunNote)}\n`
			}
		)
	)

/**
 * `linguify import`
 */
export const importCommand = new Command('import')
	.description(`Update and add keys from a ${formatList} file — never removes one`)
	.option(cliInputFlags.format, helpFor(importInput.shape.format))
	.option(cliInputFlags.path, helpFor(importInput.shape.path))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((options: IoOptions, command: Command) =>
		respond(
			command,
			() => callerFor(command).import({ format: options.format, path: options.path, dryRun: options.dryRun }),
			result => renderMutation(result, projectFolder(command))
		)
	)
