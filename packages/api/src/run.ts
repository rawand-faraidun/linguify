import {
	applyWrite,
	type OperationContext,
	type PlanOptions,
	planWrite,
	readCatalogue,
	serializeCatalogue,
	staleCatalogue
} from '@linguify/core'
import type {
	Catalogue,
	LoadedConfig,
	MutationOptions,
	MutationResult,
	OperationResult,
	WritePlan
} from '@linguify/types'

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
 * the one place a mutation reads, plans and writes: read → operation → plan → apply, or stop at the
 * plan under `dryRun`
 *
 * @note a report with no changes writes nothing — single-file serialising gives every configured locale
 * a file, so planning a no-op would still create a missing locale's file. `expectedRevision` is checked
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
	const plan =
		always || report.changes.length > 0
			? planWrite(reading.files, serializeCatalogue(loaded, catalogue), planOptions)
			: nothing
	if (dryRun) return { report, plan, revision: reading.revision, applied: false }
	return { report, plan, revision: await applyWrite(loaded, plan, reading.revision), applied: true }
}
