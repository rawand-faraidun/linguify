import { useEffect } from 'react'
import { type KeyEdit, keyEditInput } from '@linguify/table'
import type { Revision } from '@linguify/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trpcClient, useTRPC } from './trpc'

/**
 * the revision of the files the studio last read or wrote — what every write says it expects
 *
 * @note one for the page, not one per write: writes run one after another, and each takes the revision
 * the one before it left, so quick edits in a row are never refused as stale
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
 * a write to the files, as every one is made: queued behind the others, against the revision last known,
 * that revision moved on by its result, and the catalogue read again
 *
 * @param write - the API call, given the revision to expect
 *
 * @returns the write to make, settled once it is written and the catalogue read again
 */
export const useFileWrite = <Input>(
	write: (input: Input, expectedRevision: Revision) => Promise<{ revision: Revision }>
) => {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const mutation = useMutation({
		scope: filesScope,
		mutationFn: (input: Input) => write(input, known.revision),
		onSuccess: async ({ revision }) => {
			known.revision = revision
			await queryClient.invalidateQueries({ queryKey: trpc.catalogue.get.queryKey() })
		}
	})
	return mutation.mutateAsync
}

/**
 * changes a key's text in one locale, or its description
 *
 * @returns the edit to make, settled once it is written and the catalogue read again
 */
export const useEditKey = () =>
	useFileWrite((edit: KeyEdit, expectedRevision: Revision) =>
		trpcClient.key.set.mutate({ ...keyEditInput(edit), expectedRevision })
	)
