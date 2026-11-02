import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { namespaceActions, rowKinds, selectedRowState, tableControls, tableId } from '@linguify/constants'
import type { KeyPath, NamespaceName, Report } from '@linguify/types'
import type { KeyEdit, NewKey } from '../edit'
import { hiddenByView } from '../filter'
import type { NamespaceAction } from '../preflight'
import { movedPaths } from '../rename'
import { namespaceWrittenText } from '../report'
import { rowId } from '../rows'
import { deletedText } from '../said'
import { focusSection, focusTableStop, rowSelector } from './keyboard'
import { useSelection } from './selection'
import type { useTableView } from './view'

/**
 * the writes a surface makes from its table, each settled once written and read again
 */
export type TableWrites = {
	edit: (edit: KeyEdit) => Promise<unknown>
	add: (key: NewKey) => Promise<unknown>
	addNamespace: (name: NamespaceName) => Promise<{ report: Report }>
	renameNamespace: (names: { from: NamespaceName; to: NamespaceName }) => Promise<{ report: Report }>
	remove: (paths: KeyPath[]) => Promise<{ report: Report }>
}

/**
 * what follows each write from the table, as the studio and the extension both do it — each draws the
 * buttons, forms and dialogs its own way
 *
 * @note what the last write did is said until the next selection begins or the next edit. An edit holds the
 * rows in place. A key added is revealed and scrolled to, and said — hidden by the view or not — until the
 * next is begun. A namespace dialog is mounted afresh for each opening; a rename carries the view, the
 * selection and the key last added with it, and an add joins a namespace filter; once it closes the
 * keyboard goes to the section written, or the one a cancelled rename was about, else back to what opened
 * it. A bulk delete removes what the selection holds, says what core did and left, lets the selection go,
 * and gives the keyboard to the row after the last one deleted, so the person keeps their place
 *
 * @param table - the `view` from `useTableView`, and the surface's `writes`
 *
 * @returns the selection, what was said, and each write's handlers, with the refs of the buttons the
 * keyboard goes back to
 */
export const useTableWrites = ({ view, writes }: { view: ReturnType<typeof useTableView>; writes: TableWrites }) => {
	const [said, setSaid] = useState<string>()
	const selecting = useSelection({
		keys: view.keys,
		rows: view.rows,
		visible: view.visible,
		onChoose: () => setSaid(undefined)
	})
	const { pin } = view
	const { edit } = writes
	const onEdit = useCallback(
		(change: KeyEdit) => {
			pin()
			setSaid(undefined)
			return edit(change)
		},
		[pin, edit]
	)

	const [lastAdded, setLastAdded] = useState<KeyPath>()
	const added = useMemo(
		() =>
			lastAdded === undefined
				? undefined
				: { key: lastAdded, hidden: hiddenByView(view.keys, view.visible, lastAdded) },
		[lastAdded, view.keys, view.visible]
	)
	const onAdd = async (key: NewKey) => {
		await writes.add(key)
		view.reveal(key.path)
		setLastAdded(key.path)
	}
	useLayoutEffect(() => {
		if (lastAdded === undefined) return
		document.querySelector(rowSelector(rowId(rowKinds.key, lastAdded)))?.scrollIntoView({ block: 'nearest' })
	}, [lastAdded])

	const addNamespaceButton = useRef<HTMLButtonElement>(null)
	const [namespaceAction, setNamespaceAction] = useState<{ action: NamespaceAction; opening: number }>()
	const openNamespaceDialog = useCallback(
		(action: NamespaceAction) => setNamespaceAction(current => ({ action, opening: (current?.opening ?? 0) + 1 })),
		[]
	)
	const onRename = useCallback(
		(namespace: NamespaceName) => openNamespaceDialog({ kind: namespaceActions.rename, from: namespace }),
		[openNamespaceDialog]
	)
	const writeNamespace = async (name: NamespaceName) => {
		const action = namespaceAction?.action
		if (action === undefined) return
		if (action.kind === namespaceActions.rename) {
			const { from } = action
			const renamed = await writes.renameNamespace({ from, to: name })
			view.namespaceRenamed(from, name)
			selecting.namespaceRenamed(from, name)
			setLastAdded(current => current && movedPaths([current], from, name)[0])
			setSaid(namespaceWrittenText(action, name, renamed.report, false))
			return
		}
		const done = await writes.addNamespace(name)
		view.namespaceAdded(name)
		setSaid(namespaceWrittenText(action, name, done.report, view.revealing))
	}
	const namespaceClosed = (written: NamespaceName | undefined) => {
		const action = namespaceAction?.action
		setNamespaceAction(undefined)
		const named = written ?? (action?.kind === namespaceActions.rename ? action.from : undefined)
		if (focusSection(named, written !== undefined)) return
		if (action?.kind === namespaceActions.add || !focusTableStop(document.getElementById(tableId)))
			addNamespaceButton.current?.focus()
	}

	const deleteButton = useRef<HTMLButtonElement>(null)
	const after = useRef<string | undefined>(undefined)
	const onDelete = async () => {
		const shown = [...document.querySelectorAll(`#${tableId} tbody tr[data-row]`)]
		const last = shown.map(row => row.getAttribute('data-state')).lastIndexOf(selectedRowState)
		after.current =
			shown
				.slice(last + 1)
				.find(row => row.getAttribute('data-state') !== selectedRowState)
				?.getAttribute('data-row') ?? undefined
		const removed = await writes.remove(selecting.doomed.paths)
		setSaid(deletedText(removed.report))
		selecting.setChosenKeys(new Set())
	}
	/**
	 * @param deleted - whether the dialog deleted, or was cancelled
	 * @param elsewhere - where the keyboard goes when no row is left to take it
	 */
	const deleteClosed = (deleted: boolean, elsewhere?: HTMLElement | null) => {
		if (!deleted) {
			deleteButton.current?.focus()
			return
		}
		const next =
			after.current === undefined
				? null
				: document.querySelector<HTMLElement>(`${rowSelector(after.current)} [data-select] ${tableControls.cell}`)
		if (next !== null) next.focus()
		else if (!focusTableStop(document.getElementById(tableId))) elsewhere?.focus()
	}

	return {
		...selecting,
		said,
		setSaid,
		onEdit,
		added,
		onAdd,
		/**
		 * lets go of the key last added, once the next is begun
		 */
		typing: () => setLastAdded(undefined),
		namespaceAction,
		openNamespaceDialog,
		onRename,
		writeNamespace,
		namespaceClosed,
		addNamespaceButton,
		onDelete,
		deleteClosed,
		deleteButton
	}
}
