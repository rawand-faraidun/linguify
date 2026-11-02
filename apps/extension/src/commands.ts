import { type LogOutputChannel, ProgressLocation, QuickPickItemKind, Uri, window } from 'vscode'
import { createCaller, toApiError } from '@linguify/api'
import {
	actionText,
	diffKinds,
	diffText,
	extensionListLimit,
	ioDefaultPaths,
	ioFormats,
	projectActions,
	projectActionText,
	studioText
} from '@linguify/constants'
import { diffTally, formatOfFile, inSyncVerdict, relativePath } from '@linguify/keys'
import { actionDoneText, actionPlanText, actionPreview, countKeys, fill, numbers } from '@linguify/table'
import type { ProjectAction, Revision } from '@linguify/types'
import { editorLayer } from './settings'

/**
 * a sync's, format's or import's outcome — its report and plan, and the revision its plan was worked out on
 */
type Outcome = Parameters<typeof actionPreview>[0] & { revision: Revision }

/**
 * the table files the editor's dialogs offer, each format by its extension
 */
const tableFilters = Object.fromEntries(Object.values(ioFormats).map(format => [format, [format]]))

/**
 * a palette command: given the API called in-process, the project's folder as a path and as the editor's
 * `Uri`, it does its work, settling with whether it wrote the translations
 */
export type ProjectCommand = (caller: Caller, cwd: string, folder: Uri) => Promise<boolean>

/**
 * the API, called in the host for one project
 */
type Caller = ReturnType<typeof createCaller>

/**
 * runs a palette command against the project in `folder` — its failure said in linguify's words, and logged
 *
 * @param folder - the folder holding the project's config
 * @param log - the extension's log
 * @param command - the command
 *
 * @returns whether it wrote the translations, so an open panel reads them again
 */
export const runCommand = async (folder: Uri, log: LogOutputChannel, command: ProjectCommand): Promise<boolean> => {
	try {
		return await command(createCaller({ cwd: folder.fsPath, editor: editorLayer(folder) }), folder.fsPath, folder)
	} catch (error) {
		const failure = toApiError(error)
		log.error(failure)
		await window.showErrorMessage(failure.message)
		return false
	}
}

/**
 * @param title - what is being done, in words
 * @param task - the work
 *
 * @returns the work's result, a notification saying it is under way meanwhile
 */
const busy = <Result>(title: string, task: () => Promise<Result>): Thenable<Result> =>
	window.withProgress({ location: ProgressLocation.Notification, title }, task)

/**
 * works out what a sync, format or import would do, asks before doing it — what it changes, which files,
 * what needs a person — then does exactly that: the run expects the revisions its plan was worked out on,
 * so files changed in the meantime are refused, not overwritten
 *
 * @param action - the action
 * @param cwd - the project's folder, which files are shown from
 * @param plan - its dry run
 * @param run - its run, given the dry run's outcome
 *
 * @returns whether it wrote anything
 */
const confirmAndRun = async <Plan extends Outcome>(
	action: Exclude<ProjectAction, typeof projectActions.export>,
	cwd: string,
	plan: () => Promise<Plan>,
	run: (planned: Plan) => Promise<Outcome>
): Promise<boolean> => {
	const text = projectActionText[action]
	const planned = await busy(text.title, plan)
	const preview = actionPreview(planned, cwd)
	if (preview.nothing) {
		await window.showInformationMessage([actionText.nothingToDo, ...preview.warnings].join(' '))
		return false
	}
	const files = [...preview.written, ...preview.removed]
	const detail = [
		text.description,
		'',
		...actionPlanText(preview),
		...files.slice(0, extensionListLimit),
		...(files.length > extensionListLimit
			? [fill(studioText.andMore, { count: numbers.format(files.length - extensionListLimit) })]
			: []),
		...preview.warnings
	].join('\n')
	const chosen = await window.showWarningMessage(text.title, { modal: true, detail }, text.button)
	if (chosen !== text.button) return false
	const done = actionPreview(await busy(text.pending, () => run(planned)), cwd)
	void window.showInformationMessage([actionDoneText(action, done), ...done.warnings].join(' '))
	return true
}

/**
 * `Linguify: Sync` — brings every other locale in line with the default, `sync.removeUnused` as the config
 * sets it, as the CLI does without the flag
 */
export const syncCommand = (caller: Caller, cwd: string) =>
	confirmAndRun(
		projectActions.sync,
		cwd,
		() => caller.sync({ dryRun: true }),
		planned => caller.sync({ expectedRevision: planned.revision })
	)

/**
 * `Linguify: Format` — sorts and lays out every file
 */
export const formatCommand = (caller: Caller, cwd: string) =>
	confirmAndRun(
		projectActions.format,
		cwd,
		() => caller.format({ dryRun: true }),
		planned => caller.format({ expectedRevision: planned.revision })
	)

/**
 * `Linguify: Import` — the table picked in the editor's own dialog, its format by its extension; refused if
 * the table changed after its plan was shown
 */
export const importCommand = async (caller: Caller, cwd: string, folder: Uri) => {
	const [picked] =
		(await window.showOpenDialog({
			title: projectActionText.import.title,
			defaultUri: folder,
			canSelectMany: false,
			filters: tableFilters
		})) ?? []
	if (picked === undefined) return false
	const table = { path: picked.fsPath, format: formatOfFile(picked.fsPath) }
	return confirmAndRun(
		projectActions.import,
		cwd,
		() => caller.import({ ...table, dryRun: true }),
		planned => caller.import({ ...table, expectedRevision: planned.revision, expectedTable: planned.table })
	)
}

/**
 * `Linguify: Export` — every key, to the file picked in the editor's own dialog, which asks before
 * replacing one; its format by its extension, else `io.format`. The translations are untouched
 *
 * @returns `false`, as it writes no translation
 */
export const exportCommand = async (caller: Caller, cwd: string, folder: Uri) => {
	const config = await caller.config.get()
	const picked = await window.showSaveDialog({
		title: projectActionText.export.title,
		defaultUri: Uri.joinPath(folder, ioDefaultPaths[config.config.io.format]),
		filters: tableFilters
	})
	if (picked === undefined) return false
	const result = await busy(projectActionText.export.pending, () =>
		caller.export({ path: picked.fsPath, format: formatOfFile(picked.fsPath) ?? config.config.io.format })
	)
	void window.showInformationMessage(
		fill(projectActionText.export.done, { keys: countKeys(result.rows), path: relativePath(cwd, result.path) })
	)
	return false
}

/**
 * `Linguify: Diff` — each locale against the default, as the CLI says it: a list headed by each locale and
 * its tally, the keys it is missing, has extra or has empty beneath, a person able to type to find one
 *
 * @returns `false`, as it writes nothing
 */
export const diffCommand = async (caller: Caller) => {
	const diffs = await busy(diffText.pending, () => caller.diff())
	const verdict = inSyncVerdict(diffs)
	if (verdict !== undefined) {
		void window.showInformationMessage(verdict)
		return false
	}
	const items = diffs.flatMap(diff => [
		{ kind: QuickPickItemKind.Separator, label: `${diff.locale} — ${diffTally(diff)}` },
		...diffKinds.flatMap(kind =>
			diff[kind].map(key => ({ label: key, description: `${diff.locale}${diffText.separator}${kind}` }))
		)
	])
	await window.showQuickPick(items, { title: diffText.title, matchOnDescription: true })
	return false
}
