import { useEffect, useRef } from 'react'
import { newKeyNotes, studioText } from '@linguify/constants'
import { fill, isComposing, noteText, stopsAdd } from '@linguify/table'
import { useKeyRenameForm } from '@linguify/table/react'
import type { Catalogue, KeyPath, KeyRules } from '@linguify/types'
import { buttonClass, fieldClass, primaryButtonClass } from './classes'
import { FailureNotice } from './notice'

/**
 * asks for a key's new path — the key, or a whole group, moved in every locale with its descriptions — the
 * studio's dialog in a native modal one: the path checked as it is typed, the way core will
 *
 * @note its behaviour is `useKeyRenameForm`'s, the studio's too: the button does nothing while anything
 * stands in the way, and pressed then, takes the keyboard back to the path; it holds still while it writes,
 * Escape and Cancel waiting; a failure is said inside it, the path kept. Mounted afresh for each opening
 *
 * @param props - `from`, the key's path; `catalogue`, as last read; `rules`; `onSubmit`, settled once
 * written; `onClosed`, once it has closed, with the path written, or nothing when cancelled
 *
 * @returns the dialog
 */
export const KeyRenameDialog = ({
	from,
	catalogue,
	rules,
	onSubmit,
	onClosed
}: {
	from: KeyPath
	catalogue: Catalogue
	rules: KeyRules & { createNamespace: boolean }
	onSubmit: (to: KeyPath) => Promise<unknown>
	onClosed: (written: KeyPath | undefined) => void
}) => {
	const dialog = useRef<HTMLDialogElement>(null)
	const written = useRef<KeyPath | undefined>(undefined)
	const form = useKeyRenameForm({
		from,
		catalogue,
		rules,
		onSubmit,
		onWritten: to => {
			written.current = to
			dialog.current?.close()
		}
	})
	useEffect(() => {
		// opened modal, the keyboard goes to the first field in it: the path
		dialog.current?.showModal()
	}, [])
	return (
		<dialog
			ref={dialog}
			aria-labelledby="key-rename-title"
			aria-describedby="key-rename-description"
			className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-md rounded-md border border-widget-border bg-background p-4 text-foreground shadow-[0_2px_8px_var(--color-widget-shadow)] backdrop:bg-black/40"
			onCancel={event => {
				if (form.pending) event.preventDefault()
			}}
			onClose={() => onClosed(written.current)}
		>
			<form
				onSubmit={form.submit}
				onKeyDown={event => {
					// an input method's Enter and Escape are its own
					if (isComposing(event.nativeEvent) && (event.key === 'Enter' || event.key === 'Escape'))
						event.preventDefault()
				}}
				aria-busy={form.pending}
				className="flex min-w-0 flex-col gap-3"
			>
				<h2 id="key-rename-title" className="wrap-anywhere font-semibold">
					{fill(studioText.renameKey, { key: from })}
				</h2>
				<p id="key-rename-description" className="text-muted-foreground">
					{studioText.renameKeyDescription}
				</p>
				<div className="flex flex-col gap-1">
					<label htmlFor="key-path">{studioText.keyPath}</label>
					<input
						ref={form.field}
						id="key-path"
						dir="ltr"
						autoComplete="off"
						spellCheck={false}
						readOnly={form.pending}
						aria-invalid={form.notes.some(note => stopsAdd(note) && note.kind !== newKeyNotes.same)}
						aria-describedby="key-notes"
						className={`font-mono ${fieldClass}`}
						value={form.path}
						onChange={event => form.setPath(event.target.value)}
					/>
					<ul id="key-notes" className="flex flex-col gap-0.5">
						{form.notes.map(note => (
							<li
								key={noteText(note)}
								className={
									note.kind === newKeyNotes.same || !stopsAdd(note) ? 'text-muted-foreground' : 'font-semibold'
								}
							>
								{noteText(note)}
							</li>
						))}
					</ul>
					<span role="status" className="sr-only">
						{form.spoken}
					</span>
				</div>
				{form.failure !== undefined && <FailureNotice error={form.failure.error} onRefreshed={form.refreshed} />}
				<div className="flex justify-end gap-2">
					<button
						type="button"
						aria-disabled={form.pending}
						className={buttonClass}
						onClick={() => {
							if (!form.pending) dialog.current?.close()
						}}
					>
						{studioText.cancel}
					</button>
					<button type="submit" aria-disabled={!form.ready} className={primaryButtonClass}>
						{form.pending ? studioText.renaming : studioText.rename}
					</button>
				</div>
			</form>
		</dialog>
	)
}
