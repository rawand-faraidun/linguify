import { keyPathProblems, keySeparator, reservedKeySegments } from '@linguify/constants'
import type { KeyPath, KeyPathProblem, NamespaceName } from '@linguify/types'

/**
 * splits a key path into its segments
 *
 * @param path - key path to split
 *
 * @returns the segments, in order
 */
export const splitKeyPath = (path: KeyPath): string[] => path.split(keySeparator)

/**
 * joins segments into a key path
 *
 * @param segments - segments to join
 *
 * @returns the key path
 */
export const joinKeyPath = (segments: readonly string[]): KeyPath => segments.join(keySeparator)

/**
 * finds why a key path cannot be used
 *
 * @param path - key path to check
 *
 * @returns the problem, or `undefined` when the path is usable
 */
export const findKeyPathProblem = (path: KeyPath): KeyPathProblem | undefined => {
	if (path === '') return keyPathProblems.empty

	const segments = splitKeyPath(path)
	if (segments.includes('')) return keyPathProblems.emptySegment
	if (segments.some(segment => reservedKeySegments.includes(segment))) return keyPathProblems.reservedSegment

	return undefined
}

/**
 * says why a key path cannot name a translation in a project — {@link findKeyPathProblem}'s rules, and the
 * project's own
 *
 * @note with namespaces on, a path needs a namespace and a name; a format that cannot nest allows no
 * further segments
 *
 * @param path - a key path
 * @param project - whether the project has namespaces, and whether its format nests keys
 *
 * @returns the problem, or `undefined` when the path is usable there
 */
export const findProjectKeyPathProblem = (
	path: KeyPath,
	{ namespaced, nesting }: { namespaced: boolean; nesting: boolean }
): KeyPathProblem | undefined => {
	const problem = findKeyPathProblem(path)
	if (problem !== undefined) return problem
	const segments = splitKeyPath(path).length
	if (namespaced && segments < 2) return keyPathProblems.namespaceOnly
	if (!nesting && segments > (namespaced ? 2 : 1)) return keyPathProblems.tooDeep
	return undefined
}

/**
 * splits a namespaced key path into its namespace and the key inside it
 *
 * @param path - a usable key path whose first segment is the namespace
 *
 * @returns the namespace, and the rest of the path — empty when the path names only the namespace
 */
export const splitNamespace = (path: KeyPath): { namespace: NamespaceName; key: KeyPath } => {
	const [namespace = '', ...rest] = splitKeyPath(path)
	return { namespace, key: joinKeyPath(rest) }
}
