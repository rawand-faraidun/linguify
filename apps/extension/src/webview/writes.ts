import { type KeyEdit, keyEditInput, type NewKey, newKeyInput } from '@linguify/table'
import { useFileWrite } from '@linguify/table/react'
import type { KeyPath, NamespaceName, Revision } from '@linguify/types'
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

/**
 * removes keys — or whole groups — from every locale, with their descriptions
 *
 * @returns the removal to make, settled once it is written and the catalogue read again
 */
export const useRemoveKeys = () =>
	usePanelWrite((paths: KeyPath[], expectedRevision: Revision) =>
		trpcClient.key.remove.mutate({ paths, expectedRevision })
	)

/**
 * adds a key, with its text in every locale given and its description
 *
 * @returns the key to add, settled once it is written and the catalogue read again
 */
export const useAddKey = () =>
	usePanelWrite((key: NewKey, expectedRevision: Revision) =>
		trpcClient.key.add.mutate({ ...newKeyInput(key), expectedRevision })
	)

/**
 * adds an empty namespace, in every locale
 *
 * @returns the namespace to add, settled once it is written and the catalogue read again
 */
export const useAddNamespace = () =>
	usePanelWrite((name: NamespaceName, expectedRevision: Revision) =>
		trpcClient.namespace.add.mutate({ name, expectedRevision })
	)

/**
 * renames a namespace in every locale, its keys and descriptions moving with it
 *
 * @returns the rename to make, settled once it is written and the catalogue read again
 */
export const useRenameNamespace = () =>
	usePanelWrite(({ from, to }: { from: NamespaceName; to: NamespaceName }, expectedRevision: Revision) =>
		trpcClient.namespace.rename.mutate({ from, to, expectedRevision })
	)
