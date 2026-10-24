import {
	addKeyInput,
	type MutationResult,
	mutationOptions,
	removeKeysInput,
	renameKeyInput,
	setKeyInput,
	toApiError
} from '@linguify/api'
import { cliFlags, cliInputFlags, errorCodes } from '@linguify/constants'
import { ConflictError, NotFoundError } from '@linguify/core'
import type { KeyPath } from '@linguify/types'
import { Command } from 'commander'
import { callerFor } from '../../lib/caller'
import { collectTranslation, helpFor, longFlag, projectFolder, translationsFrom } from '../../lib/options'
import { respond } from '../../lib/output'
import { canAsk, confirmChange, requireSomeoneToConfirm } from '../../lib/prompt'
import { renderChanges, renderMutation } from '../../lib/render/mutation'

/**
 * the options `key add` and `key set` share
 */
type TextOptions = {
	value?: string
	translation?: [string, string][]
	desc?: string
	dryRun?: boolean
}

/**
 * `linguify key add`
 */
const addCommand = new Command('add')
	.description('Add a key to every locale')
	.argument('<path>', helpFor(addKeyInput.shape.path))
	.option(cliInputFlags.value, helpFor(addKeyInput.shape.value))
	.option(cliInputFlags.translation, helpFor(addKeyInput.shape.translations), collectTranslation)
	.option(cliInputFlags.description, helpFor(addKeyInput.shape.description))
	.option(cliFlags.createNamespace.flags, cliFlags.createNamespace.description)
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((path: KeyPath, options: TextOptions & { yes?: boolean }, command: Command) => {
		// what a dry run assumed instead of asking, said after its changes
		const notes: string[] = []
		return respond(
			command,
			() => addKey(command, path, options, notes),
			result => renderMutation(result, projectFolder(command), { notes })
		)
	})

/**
 * adds a key — asking first, at a terminal, when its namespace does not exist
 *
 * @note a dry run never asks: it shows what the run would do if the person said yes, and notes that
 * the run itself will ask. Without a terminal it fails as the run would
 *
 * @param command - the running command
 * @param path - the key
 * @param options - the text, `--yes` and `--dry-run`
 * @param notes - where to put what a dry run assumed
 *
 * @returns what was added, or would be
 *
 * @throws {@link NotFoundError} `NAMESPACE_NOT_FOUND` when the namespace does not exist and there is no
 * one to ask and no `--yes`
 */
const addKey = async (
	command: Command,
	path: KeyPath,
	options: TextOptions & { yes?: boolean },
	notes: string[]
): Promise<MutationResult> => {
	const caller = callerFor(command)
	const input = {
		path,
		value: options.value,
		translations: translationsFrom(options.translation),
		description: options.desc,
		dryRun: options.dryRun
	}
	if (options.yes === true) return caller.key.add({ ...input, createNamespace: true })
	try {
		return await caller.key.add(input)
	} catch (error) {
		const problem = toApiError(error)
		if (problem.code !== errorCodes.namespaceNotFound) throw error
		const { namespace } = problem.details ?? {}
		const missing = typeof namespace === 'string' ? `The namespace \`${namespace}\` does not exist` : problem.message
		if (!canAsk(command)) {
			throw new NotFoundError(
				`${missing}. Pass ${longFlag(cliFlags.createNamespace.flags)} to create it, or set \`keys.createNamespace\``,
				{ code: problem.code, ...(problem.details === undefined ? {} : { details: problem.details }) }
			)
		}
		if (options.dryRun === true) notes.push(`${missing}: the run will ask before creating it`)
		else await confirmChange(`${missing}. Create it?`)
		return caller.key.add({ ...input, createNamespace: true })
	}
}

/**
 * `linguify key set`
 */
const setCommand = new Command('set')
	.description("Change an existing key's text or description — never creates one")
	.argument('<path>', helpFor(setKeyInput.shape.path))
	.option(cliInputFlags.value, helpFor(setKeyInput.shape.value))
	.option(cliInputFlags.translation, helpFor(setKeyInput.shape.translations), collectTranslation)
	.option(cliInputFlags.all, helpFor(setKeyInput.shape.all))
	.option(cliInputFlags.description, helpFor(setKeyInput.shape.description))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((path: KeyPath, options: TextOptions & { all?: boolean }, command: Command) =>
		respond(
			command,
			() =>
				callerFor(command).key.set({
					path,
					value: options.value,
					translations: translationsFrom(options.translation),
					all: options.all,
					description: options.desc,
					dryRun: options.dryRun
				}),
			result => renderMutation(result, projectFolder(command))
		)
	)

/**
 * `linguify key rename`
 */
const renameCommand = new Command('rename')
	.description('Rename a key, or a whole group, in every locale, with its description')
	.argument('<from>', helpFor(renameKeyInput.shape.from))
	.argument('<to>', helpFor(renameKeyInput.shape.to))
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((from: KeyPath, to: KeyPath, options: { dryRun?: boolean }, command: Command) =>
		respond(
			command,
			() => callerFor(command).key.rename({ from, to, dryRun: options.dryRun }),
			result => renderMutation(result, projectFolder(command))
		)
	)

/**
 * `linguify key remove`
 */
const removeCommand = new Command('remove')
	.description('Remove keys, or whole groups, from every locale, with their descriptions')
	.argument('<paths...>', helpFor(removeKeysInput.shape.paths))
	.option(cliFlags.yes.flags, cliFlags.yes.description)
	.option(cliInputFlags.dryRun, helpFor(mutationOptions.shape.dryRun))
	.action((paths: KeyPath[], options: { yes?: boolean; dryRun?: boolean }, command: Command) => {
		// set once the changes were shown before the question, so they are not listed twice
		const shown = { changes: false }
		return respond(
			command,
			() => removeKeys(command, paths, options, shown),
			result => renderMutation(result, projectFolder(command), { changesShown: shown.changes })
		)
	})

/**
 * removes keys, asking first — after showing what would go — unless `--yes` or `--dry-run`; when there
 * is nothing to remove, nothing is asked
 *
 * @note the removal is checked against the revision the preview was made from, so files changed while
 * the person was deciding are refused rather than overwritten
 *
 * @param command - the running command
 * @param paths - the keys or groups to remove
 * @param options - `--yes` and `--dry-run`
 * @param shown - set when the changes were shown before the question
 *
 * @returns what was removed, or would be
 *
 * @throws {@link ValidationError} `CONFIRMATION_REQUIRED` when there is no one to confirm and no `--yes`
 * @throws {@link ConflictError} `STALE_CATALOGUE` when the files changed while the person decided
 */
const removeKeys = async (
	command: Command,
	paths: KeyPath[],
	options: { yes?: boolean; dryRun?: boolean },
	shown: { changes: boolean }
): Promise<MutationResult> => {
	const caller = callerFor(command)
	if (options.yes === true || options.dryRun === true) return caller.key.remove({ paths, dryRun: options.dryRun })

	requireSomeoneToConfirm(command, 'key remove deletes keys from every locale')
	const preview = await caller.key.remove({ paths, dryRun: true })
	if (preview.report.changes.length === 0) return caller.key.remove({ paths, expectedRevision: preview.revision })
	process.stdout.write(renderChanges(preview.report))
	shown.changes = true
	await confirmChange('Remove the keys listed above?')
	try {
		return await caller.key.remove({ paths, expectedRevision: preview.revision })
	} catch (error) {
		const problem = toApiError(error)
		if (problem.code !== errorCodes.staleCatalogue) throw error
		throw new ConflictError(
			'The translation files changed while you were deciding, so nothing was removed. Run the command again to see what it would remove now',
			{ code: problem.code, ...(problem.details === undefined ? {} : { details: problem.details }) }
		)
	}
}

/**
 * `linguify key` — `add`, `set`, `rename` or `remove`
 */
export const keyCommand = new Command('key')
	.description('Add, change, rename or remove keys')
	.addCommand(addCommand)
	.addCommand(setCommand)
	.addCommand(renameCommand)
	.addCommand(removeCommand)
