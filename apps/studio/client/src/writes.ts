import { type KeyEdit, keyEditInput, type NewKey, newKeyInput } from '@linguify/table'
import { useFileWrite as useSharedFileWrite } from '@linguify/table/react'
import type { KeyPath, NamespaceName, Revision } from '@linguify/types'
import { useQueryClient } from '@tanstack/react-query'
import { type ApiInputs, session, trpcClient, useTRPC } from './trpc'

export { useKnownRevision } from '@linguify/table/react'

/**
 * a write to the files, queued and checked as every surface's — once it goes through, what an earlier
 * failure said is taken down and the catalogue read again
 *
 * @param write - the API call, given the revision to expect
 *
 * @returns the write to make, settled once it is written and the catalogue read again
 */
const useFileWrite = <Input, Result extends { revision: Revision }>(
	write: (input: Input, expectedRevision: Revision) => Promise<Result>
) => {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	return useSharedFileWrite(write, () => {
		session.dismiss()
		return queryClient.invalidateQueries({ queryKey: trpc.catalogue.get.queryKey() })
	})
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

/**
 * adds a key, with its text in every locale given and its description
 *
 * @returns the key to add, settled once it is written and the catalogue read again
 */
export const useAddKey = () =>
	useFileWrite((key: NewKey, expectedRevision: Revision) =>
		trpcClient.key.add.mutate({ ...newKeyInput(key), expectedRevision })
	)

/**
 * removes keys — or whole groups — from every locale, with their descriptions
 *
 * @returns the removal to make, settled once it is written and the catalogue read again
 */
export const useRemoveKeys = () =>
	useFileWrite((paths: KeyPath[], expectedRevision: Revision) =>
		trpcClient.key.remove.mutate({ paths, expectedRevision })
	)

/**
 * adds an empty namespace to every locale
 *
 * @returns the namespace to add, settled once it is written and the catalogue read again
 */
export const useAddNamespace = () =>
	useFileWrite((name: NamespaceName, expectedRevision: Revision) =>
		trpcClient.namespace.add.mutate({ name, expectedRevision })
	)

/**
 * renames a namespace in every locale, its keys and descriptions moving with it
 *
 * @returns the rename to make, settled once it is written and the catalogue read again
 */
export const useRenameNamespace = () =>
	useFileWrite(({ from, to }: { from: NamespaceName; to: NamespaceName }, expectedRevision: Revision) =>
		trpcClient.namespace.rename.mutate({ from, to, expectedRevision })
	)

/**
 * the revision a project action's plan was worked out on — the one its run expects, rather than the last
 * known, so it does what the plan showed or is refused
 */
type Planned = { against: Revision }

/**
 * brings every other locale in line with the default
 *
 * @returns the sync to run, settled once it is written and the catalogue read again
 */
export const useSync = () =>
	useFileWrite(({ against, ...input }: SyncOptions & Planned) =>
		trpcClient.sync.mutate({ ...input, expectedRevision: against })
	)

/**
 * sorts and lays out every file
 *
 * @returns the format to run, settled once it is written and the catalogue read again
 */
export const useFormat = () =>
	useFileWrite(({ against }: Planned) => trpcClient.format.mutate({ expectedRevision: against }))

/**
 * a sync's options, as the dialog sets them — every one given
 */
// biome-ignore lint/suspicious/noConfusingVoidType: an optional tRPC input is typed with void, which this strips
export type SyncOptions = Required<Pick<Exclude<ApiInputs['sync'], undefined | void>, 'removeUnused'>>

/**
 * renames a key, or a whole group, in every locale, its descriptions moving with it
 *
 * @returns the rename to make, settled once it is written and the catalogue read again
 */
export const useRenameKey = () =>
	useFileWrite(({ from, to }: { from: KeyPath; to: KeyPath }, expectedRevision: Revision) =>
		trpcClient.key.rename.mutate({ from, to, expectedRevision })
	)
