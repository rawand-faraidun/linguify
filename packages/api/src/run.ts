import {
	applyWrite,
	type FileContent,
	LinguifyError,
	type OperationContext,
	type OperationResult,
	type PlanOptions,
	planWrite,
	type Report,
	readCatalogue,
	serializeCatalogue,
	staleCatalogue,
	type WritePlan
} from '@linguify/core'
import type { Catalogue, LoadedConfig, Revision } from '@linguify/types'
import type { z } from 'zod'
import type { mutationOptions } from './contracts'

/**
 * the options every mutation accepts, on top of its own input — the API's own, so read off its contract
 * rather than declared a second time
 */
export type MutationOptions = z.output<typeof mutationOptions>

/**
 * what every mutation returns
 */
export type MutationResult = {
	report: Report
	plan: WritePlan

	/**
	 * the revision after the write, or the unchanged one under `dryRun`
	 */
	revision: Revision

	/**
	 * whether the plan was carried out — `false` under `dryRun`; an empty plan is carried out by writing
	 * nothing
	 */
	applied: boolean
}

/**
 * a project, loaded for one call
 */
export type Project = {
	loaded: LoadedConfig
	operation: OperationContext
}

/**
 * an operation that changes translations — pure; {@link run} does the reading and writing
 */
export type Mutation<Input> = (context: OperationContext, catalogue: Catalogue, input: Input) => OperationResult

/**
 * how a run plans its writes
 */
export type Planning = PlanOptions & {
	/**
	 * plan the files even when the report lists no change — `format`, whose changes are files, not keys
	 */
	always?: boolean
}

/**
 * the plan of a run that changes nothing
 */
const nothing: WritePlan = { write: [], delete: [] }

/**
 * @param loaded - the loaded config
 * @param catalogue - the catalogue as read
 *
 * @returns the files it serialises to, as the plan's `previous` — or nothing when it cannot be serialised
 * as it is: a namespace the layout cannot hold, which the change may be the very repair of. The plan then
 * writes every file the change serialises, as it did before `previous` existed
 *
 * @throws anything that is not a linguify error — a bug, not a project in a bad state
 */
const serialisedAsRead = (loaded: LoadedConfig, catalogue: Catalogue): { previous?: FileContent[] } => {
	try {
		return { previous: serializeCatalogue(loaded, catalogue) }
	} catch (error) {
		if (error instanceof LinguifyError) return {}
		throw error
	}
}

/**
 * the one place a mutation reads, plans and writes: read → operation → plan → apply, or stop at the
 * plan under `dryRun`
 *
 * @note a report with no changes writes nothing — single-file serialising gives every configured locale
 * a file, so planning a no-op would still create a missing locale's file. A change writes only the files
 * it changed: one that serialises the same before and after is left as it is on disk, however it is
 * formatted — reformatting is `format`'s, which plans `always`. `expectedRevision` is checked
 * before anything else, so a stale edit is refused even as a dry run
 *
 * @param project - the loaded project
 * @param mutation - the operation
 * @param input - its input
 * @param options - `dryRun` and `expectedRevision`
 * @param planning - plan options; `always` for operations whose changes are files
 *
 * @returns the report, the plan, the revision after the write (or the one read, under `dryRun`), and
 * whether the plan was carried out
 *
 * @throws {@link ConflictError} `STALE_CATALOGUE` when `expectedRevision` is not the revision on disk, or
 * the files change while writing
 */
export const run = async <Input>(
	{ loaded, operation }: Project,
	mutation: Mutation<Input>,
	input: Input,
	{ dryRun = false, expectedRevision }: MutationOptions = {},
	{ always = false, ...planOptions }: Planning = {}
): Promise<MutationResult> => {
	const reading = await readCatalogue(loaded)
	if (expectedRevision !== undefined && expectedRevision !== reading.revision) {
		throw staleCatalogue(expectedRevision, reading.revision)
	}
	const { catalogue, report } = mutation(operation, reading.catalogue, input)
	const plan = always
		? planWrite(reading.files, serializeCatalogue(loaded, catalogue), planOptions)
		: report.changes.length > 0
			? planWrite(reading.files, serializeCatalogue(loaded, catalogue), {
					...planOptions,
					...serialisedAsRead(loaded, reading.catalogue)
				})
			: nothing
	if (dryRun) return { report, plan, revision: reading.revision, applied: false }
	return { report, plan, revision: await applyWrite(loaded, plan, reading.revision), applied: true }
}
