import { addNamespaceInput, mutationOptions, removeNamespaceInput, renameNamespaceInput } from '@linguify/api'
import { cliFlags, cliInputFlags } from '@linguify/constants'
import type { NamespaceName } from '@linguify/types'
import { Command } from 'commander'
import { callerFor } from '../../lib/caller'
import { confirmedChange } from '../../lib/confirm'
import { helpFor, projectFolder } from '../../lib/options'
import { respond } from '../../lib/output'
import { renderMutation } from '../../lib/render/mutation'
import { printable } from '../../lib/render/text'

/**
 * `linguify namespace add`
 */
const addCommand = new Command('add')
	.description('Add an empty namespace to every locale')
	.argument('<name>', helpFor(addNamespaceInput.shape.name))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((name: NamespaceName, options: { dryRun?: boolean }, command: Command) =>
		respond(
			command,
			() => callerFor(command).namespace.add({ name, dryRun: options.dryRun }),
			result => renderMutation(result, projectFolder(command))
		)
	)

/**
 * `linguify namespace rename`
 */
const renameCommand = new Command('rename')
	.description('Rename a namespace in every locale, its keys and their descriptions with it')
	.argument('<from>', helpFor(renameNamespaceInput.shape.from))
	.argument('<to>', helpFor(renameNamespaceInput.shape.to))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((from: NamespaceName, to: NamespaceName, options: { dryRun?: boolean }, command: Command) =>
		respond(
			command,
			() => callerFor(command).namespace.rename({ from, to, dryRun: options.dryRun }),
			result => renderMutation(result, projectFolder(command))
		)
	)

/**
 * `linguify namespace remove`
 */
const removeCommand = new Command('remove')
	.description('Remove a namespace from every locale, with every key in it')
	.argument('<name>', helpFor(removeNamespaceInput.shape.name))
	.option(cliFlags.confirm.flags, cliFlags.confirm.description)
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((name: NamespaceName, options: { yes?: boolean; dryRun?: boolean }, command: Command) => {
		// set once the changes were shown before the question, so they are not listed twice
		const shown = { changes: false }
		return respond(
			command,
			() =>
				confirmedChange(
					command,
					flags => callerFor(command).namespace.remove({ name, ...flags }),
					options,
					{
						refusal: 'namespace remove deletes a namespace and every key in it from every locale',
						question: `Remove the namespace \`${printable(name)}\`, with every key in it?`
					},
					shown
				),
			result => renderMutation(result, projectFolder(command), { changesShown: shown.changes })
		)
	})

/**
 * `linguify namespace` — `add`, `rename` or `remove`
 */
export const namespaceCommand = new Command('namespace')
	.description('Add, rename or remove namespaces')
	.addCommand(addCommand)
	.addCommand(renameCommand)
	.addCommand(removeCommand)
