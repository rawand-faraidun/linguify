import { type namespaceActions, newKeyNotes } from '@linguify/constants'
import {
	findConflicts,
	findDuplicate,
	findNamespaceFileProblem,
	findNamespaceNameProblem,
	findNewNameProblem,
	findProjectKeyPathProblem,
	hasNamespace,
	namespaceHolders,
	namespacesIn,
	splitNamespace
} from '@linguify/keys'
import type { Catalogue, KeyConflict, KeyPath, KeyPathProblem, KeyRules, Locale, NamespaceName } from '@linguify/types'
import type { NewKey } from './edit'

/**
 * what stands in the way of writing a key, found before anything is sent
 */
export type KeyCheck = {
	/**
	 * why the path is unusable in this project — empty, a segment empty, a reserved name, a namespace alone,
	 * too deep, a control character, or a namespace it starts that cannot be a file here — or nothing
	 */
	problem?: KeyPathProblem

	/**
	 * the locales that already hold the key
	 */
	duplicate: Locale[]

	/**
	 * the locales where nested keys are there already, or the path runs through a translation
	 */
	conflicts: KeyConflict[]

	/**
	 * the namespace the key would start, when no locale has it yet — empty namespaces count as there
	 */
	namespace?: NamespaceName
}

/**
 * checks a key about to be added, or a rename's target, the way core will
 *
 * @note the same `@linguify/keys` functions core enforces with, on the catalogue as `catalogue.get`
 * gave it — so a warning shown here is the error the write would meet, and none is invented
 *
 * @param catalogue - every locale's tree
 * @param path - the key path
 * @param rules - whether the project has namespaces, whether its format nests keys, and whether each
 * namespace is a file
 *
 * @returns what stands in the way; an unusable path is not checked further
 */
export const checkNewKey = (catalogue: Catalogue, path: KeyPath, rules: KeyRules): KeyCheck => {
	const namespace = rules.namespaced ? splitNamespace(path).namespace : undefined
	const created = namespace !== undefined && !hasNamespace(catalogue, namespace) ? namespace : undefined
	const problem =
		findProjectKeyPathProblem(path, rules) ??
		findNewNameProblem(path) ??
		(created !== undefined && rules.namespaceFiles
			? findNamespaceFileProblem(created, namespacesIn(catalogue))
			: undefined)
	if (problem !== undefined) return { problem, duplicate: [], conflicts: [] }
	return {
		duplicate: findDuplicate(catalogue, path),
		conflicts: findConflicts(catalogue, path),
		...(created === undefined ? {} : { namespace: created })
	}
}

/**
 * one thing a new key's form says, each surface in its own words
 */
export type NewKeyNote =
	| { kind: typeof newKeyNotes.problem; problem: KeyPathProblem }
	| { kind: typeof newKeyNotes.duplicate; locales: Locale[] }
	| { kind: typeof newKeyNotes.conflict; conflict: KeyConflict }
	| { kind: typeof newKeyNotes.newNamespace; namespace: NamespaceName; allowed: boolean }
	| { kind: typeof newKeyNotes.defaultRequired }

/**
 * what a new key's form says, and whether it can be added
 *
 * @note the default locale's text is required. A namespace not there yet is created only where
 * `keys.createNamespace` allows it, as core does; otherwise it stops the add, a typo caught before it
 * becomes a file
 *
 * @param catalogue - every locale's tree
 * @param key - the key as typed
 * @param rules - the project's key rules, its default locale, and `keys.createNamespace`
 *
 * @returns the notes, in the order to show them, and whether none stops the add
 */
export const checkNewKeyForm = (
	catalogue: Catalogue,
	key: NewKey,
	rules: KeyRules & { defaultLocale: Locale; createNamespace: boolean }
): { notes: NewKeyNote[]; ready: boolean } => {
	const check = checkNewKey(catalogue, key.path, rules)
	const notes: NewKeyNote[] = [
		...(check.problem === undefined ? [] : [{ kind: newKeyNotes.problem, problem: check.problem }]),
		...(check.duplicate.length === 0 ? [] : [{ kind: newKeyNotes.duplicate, locales: check.duplicate }]),
		...check.conflicts.map(conflict => ({ kind: newKeyNotes.conflict, conflict })),
		...(check.namespace === undefined
			? []
			: [{ kind: newKeyNotes.newNamespace, namespace: check.namespace, allowed: rules.createNamespace }]),
		...((key.texts[rules.defaultLocale] ?? '') === '' ? [{ kind: newKeyNotes.defaultRequired }] : [])
	]
	return { notes, ready: notes.every(note => !stopsAdd(note)) }
}

/**
 * @param note - one thing a new key's form says
 *
 * @returns whether it stops the key being added — all but a namespace that may be created
 */
export const stopsAdd = (note: NewKeyNote): boolean => note.kind !== newKeyNotes.newNamespace || !note.allowed

/**
 * what a namespace dialog does: add one, or rename one
 */
export type NamespaceAction =
	| { kind: typeof namespaceActions.add }
	| { kind: typeof namespaceActions.rename; from: NamespaceName }

/**
 * what stands in the way of a namespace name — to add, or to rename one to — found before anything is sent
 */
export type NamespaceCheck = {
	/**
	 * why the name is unusable — empty, a reserved name, a separator in it, or, where each namespace is a
	 * file, not a file name or differing from another only in case — or nothing
	 */
	problem?: KeyPathProblem

	/**
	 * the locales that already have a namespace by that name
	 */
	taken: Locale[]

	/**
	 * a rename to the name it has already — nothing wrong, but nothing to do
	 */
	same: boolean

	/**
	 * whether nothing stands in the way
	 */
	ready: boolean
}

/**
 * checks a namespace name the way core and the engine will
 *
 * @param catalogue - every locale's tree
 * @param name - the name typed
 * @param rules - `from`, the namespace being renamed, nothing when adding; `namespaceFiles`, whether each
 * namespace is a file of its own
 *
 * @returns what stands in the way, and whether nothing does
 */
export const checkNamespaceName = (
	catalogue: Catalogue,
	name: NamespaceName,
	{ from, namespaceFiles }: { from?: NamespaceName | undefined; namespaceFiles: boolean }
): NamespaceCheck => {
	const same = from !== undefined && name === from
	const problem =
		findNamespaceNameProblem(name) ??
		findNewNameProblem(name) ??
		(namespaceFiles && !same
			? findNamespaceFileProblem(
					name,
					namespacesIn(catalogue).filter(namespace => namespace !== from)
				)
			: undefined)
	const taken = problem === undefined && !same ? namespaceHolders(catalogue, name) : []
	return {
		...(problem === undefined ? {} : { problem }),
		taken,
		same,
		ready: problem === undefined && !same && taken.length === 0
	}
}
