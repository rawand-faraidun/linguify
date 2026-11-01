import { type KeyEdit, keyEditInput } from '@linguify/table'
import { useFileWrite } from '@linguify/table/react'
import type { Revision } from '@linguify/types'
import { useQueryClient } from '@tanstack/react-query'
import { trpcClient, useTRPC } from './trpc'

/**
 * a write to the files, queued and checked as every surface's — once it goes through, the catalogue is read
 * again
 *
 * @param write - the API call, given the revision to expect
 *
 * @returns the write to make, settled once it is written and the catalogue read again
 */
const usePanelWrite = <Input, Result extends { revision: Revision }>(
	write: (input: Input, expectedRevision: Revision) => Promise<Result>
) => {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	return useFileWrite(write, () => queryClient.invalidateQueries({ queryKey: trpc.catalogue.get.queryKey() }))
}

/**
 * changes a key's text in one locale, or its description
 *
 * @returns the edit to make, settled once it is written and the catalogue read again
 */
export const useEditKey = () =>
	usePanelWrite((edit: KeyEdit, expectedRevision: Revision) =>
		trpcClient.key.set.mutate({ ...keyEditInput(edit), expectedRevision })
	)
