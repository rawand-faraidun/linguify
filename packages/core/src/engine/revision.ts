import { createHash } from 'node:crypto'
import { revisionHashing } from '@linguify/constants'
import type { Revision } from '@linguify/types'
import type { FileSnapshot } from './types'

/**
 * fingerprints the files a catalogue was read from
 *
 * @note a hash of the exact text, not of size and modification time: an edit that keeps the size and
 * lands within the filesystem's timestamp resolution would slip past those. Files are taken in path
 * order, so the order an engine reads them in never matters
 *
 * @param files - every file read, present or not
 *
 * @returns the revision a later write must still match
 */
export const computeRevision = (files: readonly FileSnapshot[]): Revision => {
	const hash = createHash(revisionHashing.algorithm)
	const { separator } = revisionHashing
	for (const { path, content } of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
		hash
			.update(path)
			.update(separator)
			.update(content ?? revisionHashing.absentFile)
			.update(separator)
	}
	return hash.digest(revisionHashing.encoding)
}

/**
 * fingerprints one file's bytes — a table read for an import, which a run must find as its dry run did
 *
 * @param content - the file's bytes
 *
 * @returns its revision
 */
export const computeContentRevision = (content: Uint8Array): Revision =>
	createHash(revisionHashing.algorithm).update(content).digest(revisionHashing.encoding)
