import { type MutationResult, toApiError } from '@linguify/api'
import { errorCodes } from '@linguify/constants'
import { ConflictError } from '@linguify/core'
import type { Revision } from '@linguify/types'
import type { Command } from 'commander'
import { confirmChange, requireSomeoneToConfirm } from './prompt'
import { renderChanges } from './render/mutation'

/**
 * how a change that needs confirming is carried out: as a dry run, or for real against a revision
 */
export type ConfirmableChange = (options: { dryRun?: boolean; expectedRevision?: Revision }) => Promise<MutationResult>

/**
 * carries out a change that deletes something — asking first, after showing what it would do, unless
 * `--yes` or `--dry-run`; when it would change nothing, nothing is asked
 *
 * @note the preview comes before the refusal, so a script hears what is actually wrong — a namespace
 * that does not exist — rather than being told to pass `--yes` and then failing anyway. The change is
 * checked against the revision the preview was made from, so files changed while the person was
 * deciding are refused rather than overwritten
 *
 * @param command - the running command
 * @param change - the change
 * @param flags - `--yes` and `--dry-run`
 * @param wording - `refusal`: why it needs confirming, for when no one can — `key remove deletes keys
 * from every locale`; `question`: what to confirm — `Remove the keys listed above?`
 * @param shown - set when the changes were shown before the question, so they are not listed again
 *
 * @returns what was changed, or would be
 *
 * @throws {@link ValidationError} `CONFIRMATION_REQUIRED` when there is no one to confirm and no `--yes`
 * @throws {@link ConflictError} `STALE_CATALOGUE` when the files changed while the person decided
 */
export const confirmedChange = async (
	command: Command,
	change: ConfirmableChange,
	flags: { yes?: boolean; dryRun?: boolean },
	wording: { refusal: string; question: string },
	shown: { changes: boolean }
): Promise<MutationResult> => {
	if (flags.yes === true || flags.dryRun === true) return change(flags.dryRun === true ? { dryRun: true } : {})

	const preview = await change({ dryRun: true })
	if (preview.report.changes.length === 0) return change({ expectedRevision: preview.revision })
	requireSomeoneToConfirm(command, wording.refusal)
	process.stdout.write(renderChanges(preview.report))
	shown.changes = true
	await confirmChange(wording.question)
	try {
		return await change({ expectedRevision: preview.revision })
	} catch (error) {
		const problem = toApiError(error)
		if (problem.code !== errorCodes.staleCatalogue) throw error
		throw new ConflictError(
			'The translation files changed while you were deciding, so nothing was written. Run the command again to see what it would do now',
			{ code: problem.code, ...(problem.details === undefined ? {} : { details: problem.details }) }
		)
	}
}
