import { type LogOutputChannel, ProgressLocation, QuickPickItemKind, Uri, window } from 'vscode'
import { createCaller, toApiError } from '@linguify/api'
import {
	actionText,
	diffKinds,
	diffText,
	extensionListLimit,
	extensionText,
	ioDefaultPaths,
	ioFormats,
	projectActions,
	projectActionText,
	studioText
} from '@linguify/constants'
import { diffTally, formatOfFile, inSyncVerdict, relativePath } from '@linguify/keys'
import { actionDoneText, actionPlanText, actionPreview, countKeys, fill, numbers } from '@linguify/table'
import type { IoFormat, ProjectAction, Revision } from '@linguify/types'
import { editorLayer } from './settings'

/**
 * a sync's, format's or import's outcome — its report and plan, and the revision its plan was worked out on
 */
type Outcome = Parameters<typeof actionPreview>[0] & { revision: Revision }

/**
 * the API, called in the host for one project
 */
type Caller = ReturnType<typeof createCaller>

/**
 * the project a palette command works on
 */
export type Project = {
	/**
	 * the API, called in-process for it
	 */
	caller: Caller

	/**
	 * the folder holding its config, as a path — what files are shown from — and as the editor's `Uri`
	 */
	cwd: string
	folder: Uri

	/**
	 * its folder's name when the workspace has several projects, so every question and answer says which;
	 * nothing when it has one
	 */
	name: string | undefined
}

/**
 * a palette command: given its project, it does its work, settling with whether it wrote the translations
 */
export type ProjectCommand = (project: Project) => Promise<boolean>

/**
 * @param text - what a notification says — which may quote keys, file names and a table's headers
 *
 * @returns it with no link left in it: the editor makes `[label](command:…)` in a notification a link
 * that runs the command, and a translation file or a table must never be able to put one there
 */
export const unlinked = (text: string): string => text.replaceAll('](', ']​(')

/**
 * says something in a notification, never waiting on it — the editor settles one only once it is gone
 *
 * @param kind - an error, or anything else
 * @param parts - what to say, joined by spaces
 */
export const say = (kind: 'info' | 'error', ...parts: string[]) => {
	const text = unlinked(parts.join(' '))
	void (kind === 'error' ? window.showErrorMessage(text) : window.showInformationMessage(text))
}

/**
 * runs a palette command against the project in `folder` — its failure said in linguify's words, and logged
 *
 * @param folder - the folder holding the project's config
 * @param name - its folder's name when the workspace has several projects
 * @param log - the extension's log
 * @param command - the command
 *
 * @returns whether it wrote the translations, so an open panel reads them again
 */
export const runCommand = async (
	folder: Uri,
	name: string | undefined,
	log: LogOutputChannel,
	command: ProjectCommand
): Promise<boolean> => {
	try {
		const caller = createCaller({ cwd: folder.fsPath, editor: editorLayer(folder) })
		return await command({ caller, cwd: folder.fsPath, folder, name })
	} catch (error) {
		const failure = toApiError(error)
		log.error(failure)
		say('error', failure.message)
		return false
	}
}

/**
 * @param text - a title, a question or an answer
 * @param name - the project's name, when there are several
 *
 * @returns it naming the project, when there are several
 */
const named = (text: string, name: string | undefined) =>
	name === undefined ? text : fill(extensionText.ofProject, { text, project: name })

/**
 * @param lines - lines for the confirmation's detail or a notification
 *
 * @returns the first `extensionListLimit`, then how many more there are — the editor's own dialog does not
 * scroll, and lines past its height would push its buttons out of reach
 */
const capped = (lines: readonly string[]): string[] => [
	...lines.slice(0, extensionListLimit),
	...(lines.length > extensionListLimit
		? [fill(studioText.andMore, { count: numbers.format(lines.length - extensionListLimit) })]
		: [])
]

/**
 * @param title - what is being done, in words
 * @param task - the work
 *
 * @returns the work's result, a notification saying it is under way meanwhile
 */
const busy = <Result>(title: string, task: () => Promise<Result>): Thenable<Result> =>
	window.withProgress({ location: ProgressLocation.Notification, title: unlinked(title) }, task)

/**
 * works out what a sync, format or import would do, asks before doing it — what it changes, which files,
 * what needs a person, and which project when there are several — then does exactly that: the run expects
 * the revisions its plan was worked out on, so files changed in the meantime are refused, not overwritten
 *
 * @param action - the action
 * @param project - the project
 * @param plan - its dry run
 * @param run - its run, given the dry run's outcome
 *
 * @returns whether it wrote anything
 */
const confirmAndRun = async <Plan extends Outcome>(
	action: Exclude<ProjectAction, typeof projectActions.export>,
	{ cwd, name }: Project,
	plan: () => Promise<Plan>,
	run: (planned: Plan) => Promise<Outcome>
): Promise<boolean> => {
	const text = projectActionText[action]
	const planned = await busy(named(text.title, name), plan)
	const preview = actionPreview(planned, cwd)
	if (preview.nothing) {
		say('info', named(actionText.nothingToDo, name), ...capped(preview.warnings))
		return false
	}
	// the modal's detail is drawn as plain text, never as links
	const detail = [
		text.description,
		'',
		...actionPlanText(preview),
		...capped([...preview.written, ...preview.removed]),
		...capped(preview.warnings)
	].join('\n')
	const chosen = await window.showWarningMessage(named(text.title, name), { modal: true, detail }, text.button)
	if (chosen !== text.button) return false
	const done = actionPreview(await busy(named(text.pending, name), () => run(planned)), cwd)
	say('info', named(actionDoneText(action, done), name), ...capped(done.warnings))
	return true
}

/**
 * @param first - the format to offer first — the one the dialog falls back on when no extension is typed
 *
 * @returns the table files the editor's dialogs offer, each format by its extension, then any file
 */
const tableFilters = (first: IoFormat) =>
	Object.fromEntries([
		...[first, ...Object.values(ioFormats).filter(format => format !== first)].map(format => [
			format.toUpperCase(),
			[format]
		]),
		[extensionText.allFiles, ['*']]
	])

/**
 * `Linguify: Sync` — brings every other locale in line with the default, `sync.removeUnused` as the config
 * sets it, as the CLI does without the flag
 */
export const syncCommand: ProjectCommand = project =>
	confirmAndRun(
		projectActions.sync,
		project,
		() => project.caller.sync({ dryRun: true }),
		planned => project.caller.sync({ expectedRevision: planned.revision })
	)

/**
 * `Linguify: Format` — sorts and lays out every file
 */
export const formatCommand: ProjectCommand = project =>
	confirmAndRun(
		projectActions.format,
		project,
		() => project.caller.format({ dryRun: true }),
		planned => project.caller.format({ expectedRevision: planned.revision })
	)

/**
 * `Linguify: Import` — the table picked in the editor's own dialog, its format by its extension; refused if
 * the table changed after its plan was shown
 */
export const importCommand: ProjectCommand = async project => {
	const config = await project.caller.config.get()
	const [picked] =
		(await window.showOpenDialog({
			title: named(projectActionText.import.title, project.name),
			defaultUri: project.folder,
			canSelectMany: false,
			filters: tableFilters(config.config.io.format)
		})) ?? []
	if (picked === undefined) return false
	const table = { path: picked.fsPath, format: formatOfFile(picked.fsPath) }
	return confirmAndRun(
		projectActions.import,
		project,
		() => project.caller.import({ ...table, dryRun: true }),
		planned => project.caller.import({ ...table, expectedRevision: planned.revision, expectedTable: planned.table })
	)
}

/**
 * `Linguify: Export` — every key, to the file picked in the editor's own dialog, which asks before
 * replacing one; its format by its extension, else `io.format`. The translations are untouched
 *
 * @returns `false`, as it writes no translation
 */
export const exportCommand: ProjectCommand = async ({ caller, cwd, folder, name }) => {
	const config = await caller.config.get()
	const format = config.config.io.format
	const picked = await window.showSaveDialog({
		title: named(projectActionText.export.title, name),
		defaultUri: Uri.joinPath(folder, ioDefaultPaths[format]),
		filters: tableFilters(format)
	})
	if (picked === undefined) return false
	const result = await busy(named(projectActionText.export.pending, name), () =>
		caller.export({ path: picked.fsPath, format: formatOfFile(picked.fsPath) ?? format })
	)
	say(
		'info',
		named(
			fill(projectActionText.export.done, { keys: countKeys(result.rows), path: relativePath(cwd, result.path) }),
			name
		)
	)
	return false
}

/**
 * @param text - a key, or anything else a quick pick shows
 *
 * @returns it shown as written: the editor draws `$(name)` in a quick pick as an icon
 */
const iconless = (text: string) => text.replaceAll('$(', '$​(')

/**
 * `Linguify: Diff` — each locale against the default, as the CLI says it: a list headed by each locale and
 * its tally, the keys it is missing, has extra or has empty beneath, a person able to type to find one
 *
 * @returns `false`, as it writes nothing
 */
export const diffCommand: ProjectCommand = async ({ caller, name }) => {
	const diffs = await busy(named(diffText.pending, name), () => caller.diff())
	const verdict = inSyncVerdict(diffs)
	if (verdict !== undefined) {
		say('info', named(verdict, name))
		return false
	}
	const items = diffs.flatMap(diff => [
		{ kind: QuickPickItemKind.Separator, label: `${diff.locale} — ${diffTally(diff)}` },
		...diffKinds.flatMap(kind =>
			diff[kind].map(key => ({ label: iconless(key), description: `${diff.locale}${diffText.separator}${kind}` }))
		)
	])
	await window.showQuickPick(items, { title: named(diffText.title, name), matchOnDescription: true })
	return false
}
