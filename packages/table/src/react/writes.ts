import { useEffect } from 'react'
import type { Revision } from '@linguify/types'
import { useMutation } from '@tanstack/react-query'

/**
 * the revision of the files the page last read or wrote — what every write says it expects
 *
 * @note one for the page, not one per write: writes run one after another, and each takes the revision
 * the one before it left, so quick edits in a row are never refused as stale. Each surface is its own page,
 * and so has its own
 */
const known: { revision: Revision } = { revision: '' }

/**
 * every write in one queue: each starts once the one before has settled
 */
const filesScope = { id: 'files' }

/**
 * keeps the known revision to the catalogue the page last read
 *
 * @param revision - the catalogue's revision, as read
 */
export const useKnownRevision = (revision: Revision) => {
	useEffect(() => {
		known.revision = revision
	}, [revision])
}

/**
 * a write to the files, as the studio and the extension both make every one: queued behind the others,
 * against the revision last known, that revision moved on by its result, then `written` — which reads the
 * catalogue again, and takes down what an earlier failure said
 *
 * @param write - the API call, given the revision to expect
 * @param written - what the surface does once a write has gone through
 *
 * @returns the write to make, settled with its result once it is written and `written` has run
 */
export const useFileWrite = <Input, Result extends { revision: Revision }>(
	write: (input: Input, expectedRevision: Revision) => Promise<Result>,
	written: () => Promise<unknown>
) => {
	const mutation = useMutation({
		scope: filesScope,
		mutationFn: (input: Input) => write(input, known.revision),
		onSuccess: async ({ revision }) => {
			known.revision = revision
			await written()
		}
	})
	return mutation.mutateAsync
}
