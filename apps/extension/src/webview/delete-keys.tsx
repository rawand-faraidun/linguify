import { useEffect, useRef, useState } from 'react'
import { deleteListLimit, studioText } from '@linguify/constants'
import { countKeys, fill, numbers, plural } from '@linguify/table'
import type { KeyPath, Locale } from '@linguify/types'
import { FailureNotice } from './notice'

/**
 * asks before a bulk delete — the studio's confirmation, in a native modal dialog: how many keys, which,
 * from which locales, and how many of them the filter hides, which go too
 *
 * @note it holds still while the keys are written away: Delete pressed again does nothing, and Cancel and
 * Escape wait, so nothing is deleted after a person cancelled. A failure is said inside it, with a Refresh
 * when the files changed on disk. While it writes it keeps showing the keys it asked about, though the
 * selection empties as they go. The list is one stop for Tab, so the keyboard can scroll it
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
	// what it asked about, held while it writes and closes
	const [asked] = useState({ keys, hidden })
	const deleted = useRef(false)
	useEffect(() => {
		dialog.current?.showModal()
	}, [])
	return (
		<dialog
			ref={dialog}
			aria-labelledby="delete-title"
			aria-describedby="delete-description"
			className="m-auto max-h-[calc(100dvh-2rem)] max-w-lg border border-control-border bg-background p-4 text-foreground backdrop:bg-black/40"
			onCancel={event => {
				if (pending) event.preventDefault()
			}}
			onClose={() => onClosed(deleted.current)}
		>
			<h2 id="delete-title" className="mb-2 font-semibold">
				{fill(studioText.deleteTitle, { keys: countKeys(asked.keys.length) })}
			</h2>
			<p id="delete-description" className="mb-2 text-muted-foreground">
				{fill(studioText.deleteDescription, { locales: locales.join(studioText.listSeparator) })}
				{asked.hidden > 0 && (
					<>
						{' '}
						{plural(
							asked.hidden === asked.keys.length ? studioText.deleteAllHidden : studioText.deleteHidden,
							asked.hidden
						)}
					</>
				)}
			</p>
			<ul
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a list that scrolls must be reachable to scroll
				tabIndex={0}
				aria-label={studioText.deleteList}
				className="mb-3 max-h-48 overflow-auto border border-control-border p-2 font-mono"
				dir="ltr"
			>
				{asked.keys.slice(0, deleteListLimit).map(key => (
					<li key={key} className="wrap-anywhere">
						{key}
					</li>
				))}
				{asked.keys.length > deleteListLimit && (
					<li className="font-sans text-muted-foreground">
						{fill(studioText.andMore, { count: numbers.format(asked.keys.length - deleteListLimit) })}
					</li>
				)}
			</ul>
			{failure !== undefined && <FailureNotice error={failure.error} onRefreshed={() => setFailure(undefined)} />}
			<div className="mt-3 flex justify-end gap-2">
				<button
					type="button"
					aria-disabled={pending}
					className={`${controlClass} aria-disabled:opacity-50`}
					onClick={() => {
						if (!pending) dialog.current?.close()
					}}
				>
					{studioText.cancel}
				</button>
				<button
					type="button"
					aria-disabled={pending}
					className="border border-control-border bg-chosen px-2 py-0.5 font-semibold text-chosen-foreground aria-disabled:opacity-50"
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

const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
