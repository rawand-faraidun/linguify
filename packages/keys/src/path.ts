import { fileNamePattern, keyPathProblems, keySeparator, reservedKeySegments } from '@linguify/constants'
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
 * says why a name cannot be a namespace — a key path's rules, and no separator, as the first one parts the
 * namespace from the key
 *
 * @param name - a namespace name
 *
 * @returns the problem, or `undefined` when the name is usable
 */
export const findNamespaceNameProblem = (name: NamespaceName): KeyPathProblem | undefined =>
	findKeyPathProblem(name) ?? (splitKeyPath(name).length > 1 ? keyPathProblems.separator : undefined)

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

/**
 * @param key - a key path
 * @param path - another key path
 *
 * @returns whether `key` is `path` itself or a key nested under it
 */
export const isWithin = (key: KeyPath, path: KeyPath): boolean =>
	key === path || key.startsWith(`${path}${keySeparator}`)

/**
 * where a key path is after the key or group at `from` moves to `to` — a key rename, or a namespace's
 *
 * @param path - a key path
 * @param from - the path moved
 * @param to - where it moved to
 *
 * @returns the path under `to` when it was within `from`, else the path itself
 */
export const movePath = (path: KeyPath, from: KeyPath, to: KeyPath): KeyPath =>
	isWithin(path, from) ? `${to}${path.slice(from.length)}` : path

/**
 * the namespace another would share a file with on a case-insensitive disk, where each namespace is a file
 *
 * @param name - a namespace name
 * @param others - the other namespaces
 *
 * @returns the one that differs from it only in case, if any
 */
export const fileClash = (name: NamespaceName, others: readonly NamespaceName[]): NamespaceName | undefined =>
	others.find(other => other !== name && other.toLowerCase() === name.toLowerCase())

/**
 * says why a name cannot be a namespace where each namespace is a file of its own — a path separator, `.`
 * or `..`, or another namespace differing from it only in case
 *
 * @param name - a namespace name, usable as a namespace
 * @param others - the other namespaces
 *
 * @returns the problem, or `undefined` when the name can be a file
 */
export const findNamespaceFileProblem = (
	name: NamespaceName,
	others: readonly NamespaceName[]
): KeyPathProblem | undefined => {
	if (!fileNamePattern.test(name)) return keyPathProblems.fileName
	return fileClash(name, others) === undefined ? undefined : keyPathProblems.caseClash
}
