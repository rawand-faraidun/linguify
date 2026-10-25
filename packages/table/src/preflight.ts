import { findConflicts, findDuplicate, findKeyPathProblem } from '@linguify/keys'
import type { Catalogue, KeyConflict, KeyPath, KeyPathProblem, Locale } from '@linguify/types'

/**
 * what stands in the way of writing a key, found before anything is sent
 */
export type KeyCheck = {
	/**
	 * why the path is unusable — empty, a segment empty, a reserved name — or nothing
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
}

/**
 * checks a key about to be added, or a rename's target, the way core will
 *
 * @note the same `@linguify/keys` functions core enforces with, on the catalogue as `catalogue.get`
 * gave it — so a warning shown here is the error the write would meet, and none is invented
 *
 * @param catalogue - every locale's tree
 * @param path - the key path
 *
 * @returns what stands in the way; an unusable path is not checked further
 */
export const checkNewKey = (catalogue: Catalogue, path: KeyPath): KeyCheck => {
	const problem = findKeyPathProblem(path)
	if (problem !== undefined) return { problem, duplicate: [], conflicts: [] }
	return { duplicate: findDuplicate(catalogue, path), conflicts: findConflicts(catalogue, path) }
}
