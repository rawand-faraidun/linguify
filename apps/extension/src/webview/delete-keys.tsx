import { useEffect, useRef, useState } from 'react'
import { studioText } from '@linguify/constants'
import { deleteText } from '@linguify/table'
import type { KeyPath, Locale } from '@linguify/types'
import { buttonClass, primaryButtonClass } from './classes'
import { FailureNotice } from './notice'

/**
 * asks before a bulk delete — the studio's confirmation, in a native modal dialog: how many keys, which,
 * from which locales, and how many of them the filter hides, which go too
 *
 * @note it holds still while the keys are written away: Delete pressed again does nothing, and Cancel and
 * Escape wait, so nothing is deleted after a person cancelled. A failure is said inside it, with a Refresh
 * when the files changed on disk, after which it asks about what is selected now, the keyboard on Delete.
 * While it writes it keeps showing the keys it asked about, though the selection empties as they go. The list is one stop for Tab, so the keyboard can scroll it
 *
 * @param props - `keys`, the paths to remove; `hidden`, how many the view does not show; `locales`, every
 * locale; `onDelete`, settled once removed; `onClosed`, once the dialog has closed, saying whether it deleted
 *
 * @returns the dialog
 */
export const DeleteKeys = ({
	keys,
	hidden,
	locales,
	onDelete,
	onClosed
}: {
	keys: readonly KeyPath[]
	hidden: number
	locales: readonly Locale[]
	onDelete: () => Promise<unknown>
	onClosed: (deleted: boolean) => void
}) => {
	const dialog = useRef<HTMLDialogElement>(null)
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<{ error: unknown }>()
	const deleted = useRef(false)
	const deleteAction = useRef<HTMLButtonElement>(null)
	// what it asks about follows the selection — a refresh lets go of keys gone from the files — and is held
	// while it writes and closes
	const asked = useRef({ keys, hidden })
	if (!pending && !deleted.current) asked.current = { keys, hidden }
	const shown = asked.current
	const said = deleteText(shown.keys, shown.hidden, locales)
	useEffect(() => {
		dialog.current?.showModal()
	}, [])
	return (
		<dialog
			ref={dialog}
			aria-labelledby="delete-title"
			aria-describedby="delete-description"
			className="m-auto max-h-[calc(100dvh-2rem)] max-w-lg border border-widget-border bg-background p-4 text-foreground shadow-[0_2px_8px_var(--color-widget-shadow)] backdrop:bg-black/40"
			onCancel={event => {
				if (pending) event.preventDefault()
			}}
			onClose={() => onClosed(deleted.current)}
		>
			<h2 id="delete-title" className="mb-2 font-semibold">
				{said.title}
			</h2>
			<p id="delete-description" className="mb-2 text-muted-foreground">
				{said.description}
			</p>
			<ul
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a list that scrolls must be reachable to scroll
				tabIndex={0}
				aria-label={studioText.deleteList}
				className="mb-3 max-h-48 overflow-auto border border-control-border p-2 font-mono"
				dir="ltr"
			>
				{said.listed.map(key => (
					<li key={key} className="wrap-anywhere">
						{key}
					</li>
				))}
				{said.more !== undefined && <li className="font-sans text-muted-foreground">{said.more}</li>}
			</ul>
			{failure !== undefined && (
				<FailureNotice
					error={failure.error}
					onRefreshed={() => {
						// the notice goes, and the keyboard with it: back on Delete, to delete what is selected now
						setFailure(undefined)
						deleteAction.current?.focus()
					}}
				/>
			)}
			<div className="mt-3 flex justify-end gap-2">
				<button
					type="button"
					aria-disabled={pending}
					className={buttonClass}
					onClick={() => {
						if (!pending) dialog.current?.close()
					}}
				>
					{studioText.cancel}
				</button>
				<button
					ref={deleteAction}
					type="button"
					aria-disabled={pending}
					className={primaryButtonClass}
					onClick={() => {
						if (pending) return
						setPending(true)
						setFailure(undefined)
						void onDelete().then(
							() => {
								setPending(false)
								deleted.current = true
								dialog.current?.close()
							},
							error => {
								setFailure({ error })
								setPending(false)
							}
						)
					}}
				>
					{pending ? studioText.deleting : studioText.deleteSelected}
				</button>
			</div>
		</dialog>
	)
}
