import { useEffect } from 'react'
import { type KeyEdit, keyEditInput, type NewKey, newKeyInput } from '@linguify/table'
import type { KeyPath, Locale, NamespaceName, Revision } from '@linguify/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ApiInputs, trpcClient, useTRPC } from './trpc'

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
 * @returns the write to make, settled with its result once it is written and the catalogue read again
 */
export const useFileWrite = <Input, Result extends { revision: Revision }>(
	write: (input: Input, expectedRevision: Revision) => Promise<Result>
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

/**
 * adds a key, with its text in every locale given and its description
 *
 * @param defaultLocale - the default locale, whose text is the key's value
 *
 * @returns the key to add, settled once it is written and the catalogue read again
 */
export const useAddKey = (defaultLocale: Locale) =>
	useFileWrite((key: NewKey, expectedRevision: Revision) =>
		trpcClient.key.add.mutate({ ...newKeyInput(key, defaultLocale), expectedRevision })
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
 * brings every other locale in line with the default
 *
 * @returns the sync to run, settled once it is written and the catalogue read again
 */
export const useSync = () =>
	useFileWrite((input: SyncOptions, expectedRevision: Revision) =>
		trpcClient.sync.mutate({ ...input, expectedRevision })
	)

/**
 * sorts and lays out every file
 *
 * @returns the format to run, settled once it is written and the catalogue read again
 */
export const useFormat = () =>
	useFileWrite((_: null, expectedRevision: Revision) => trpcClient.format.mutate({ expectedRevision }))

/**
 * updates and adds keys from a table
 *
 * @returns the import to run, settled once it is written and the catalogue read again
 */
export const useImport = () =>
	useFileWrite((input: TableTarget, expectedRevision: Revision) =>
		trpcClient.import.mutate({ ...input, expectedRevision })
	)

/**
 * writes every key to a table — no translation changes, so outside the files' queue and revision, its
 * failure reported as any write's
 *
 * @returns the export to run, settled once the table is written
 */
export const useExport = () => {
	const mutation = useMutation({
		mutationFn: (input: TableTarget) => trpcClient.export.mutate(input)
	})
	return mutation.mutateAsync
}

/**
 * a sync's options, as the dialog sets them — every one given
 */
// biome-ignore lint/suspicious/noConfusingVoidType: an optional tRPC input is typed with void, which this strips
export type SyncOptions = Required<Pick<Exclude<ApiInputs['sync'], undefined | void>, 'removeUnused'>>

/**
 * the table an import reads or an export writes: its format and file, as the dialogs choose them
 */
// biome-ignore lint/suspicious/noConfusingVoidType: an optional tRPC input is typed with void, which this strips
export type TableTarget = Required<Pick<Exclude<ApiInputs['export'], undefined | void>, 'format' | 'path'>>
