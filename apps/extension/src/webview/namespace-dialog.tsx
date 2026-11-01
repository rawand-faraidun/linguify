import { useEffect, useRef } from 'react'
import { compositionKeyCode, studioText } from '@linguify/constants'
import { fill, type NamespaceAction } from '@linguify/table'
import { useNamespaceForm } from '@linguify/table/react'
import type { Catalogue, NamespaceName } from '@linguify/types'
import { FailureNotice } from './notice'

/**
 * asks for a namespace's name — a new one, or one to rename to — the studio's dialog in a native modal one:
 * the name checked as it is typed, the way core and the engine will, and the button doing nothing while
 * anything stands in its way
 *
 * @note its behaviour is `useNamespaceForm`'s, the studio's too: the first problem said aloud once typing
 * pauses, the button pressed then taking the keyboard back to the name; it holds still while it writes —
 * Escape and Cancel wait — and a failure is said inside it, the name kept. Mounted afresh for each opening
 *
 * @param props - `action`; `catalogue`, as last read; `namespaceFiles`, whether each namespace is a file;
 * `onSubmit`, settled once written; `onClosed`, once it has closed, with the name written, or nothing when
 * cancelled
 *
 * @returns the dialog
 */
export const NamespaceDialog = ({
	action,
	catalogue,
	namespaceFiles,
	onSubmit,
	onClosed
}: {
	action: NamespaceAction
	catalogue: Catalogue
	namespaceFiles: boolean
	onSubmit: (name: NamespaceName) => Promise<unknown>
	onClosed: (written: NamespaceName | undefined) => void
}) => {
	const dialog = useRef<HTMLDialogElement>(null)
	const written = useRef<NamespaceName | undefined>(undefined)
	const form = useNamespaceForm({
		action,
		catalogue,
		namespaceFiles,
		onSubmit,
		onWritten: name => {
			written.current = name
			dialog.current?.close()
		}
	})
	useEffect(() => {
		// opened modal, the keyboard goes to the first field in it: the name
		dialog.current?.showModal()
	}, [])
	const { renaming } = form
	const adding = renaming === undefined
	return (
		<dialog
			ref={dialog}
			aria-labelledby="namespace-title"
			aria-describedby="namespace-description"
			className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-md border border-widget-border bg-background p-4 text-foreground shadow-[0_2px_8px_var(--color-widget-shadow)] backdrop:bg-black/40"
			onCancel={event => {
				if (form.pending) event.preventDefault()
			}}
			onClose={() => onClosed(written.current)}
		>
			<form
				onSubmit={form.submit}
				onKeyDown={event => {
					const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === compositionKeyCode
					if (!composing) return
					// an input method's Enter and Escape are its own
					if (event.key === 'Enter' || event.key === 'Escape') event.preventDefault()
				}}
				aria-busy={form.pending}
				className="flex min-w-0 flex-col gap-3"
			>
				<h2 id="namespace-title" className="wrap-anywhere font-semibold">
					{renaming === undefined ? studioText.addNamespaceTitle : fill(studioText.renameNamespace, { name: renaming })}
				</h2>
				<p id="namespace-description" className="text-muted-foreground">
					{adding ? studioText.addNamespaceDescription : studioText.renameNamespaceDescription}
				</p>
				<div className="flex flex-col gap-1">
					<label htmlFor="namespace-name">{studioText.namespaceName}</label>
					<input
						ref={form.field}
						id="namespace-name"
						dir="ltr"
						autoComplete="off"
						spellCheck={false}
						readOnly={form.pending}
						aria-invalid={form.notes.length > 0}
						aria-describedby="namespace-notes"
						className="border border-input-border bg-input px-1.5 py-0.5 font-mono text-input-foreground"
						value={form.name}
						onChange={event => form.setName(event.target.value)}
					/>
					<ul id="namespace-notes" className="flex flex-col gap-0.5">
						{form.notes.map(note => (
							<li key={note} className="font-semibold">
								{note}
							</li>
						))}
						{form.same && <li className="text-muted-foreground">{studioText.namespaceSame}</li>}
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
						className={`${controlClass} aria-disabled:opacity-50`}
						onClick={() => {
							if (!form.pending) dialog.current?.close()
						}}
					>
						{studioText.cancel}
					</button>
					<button
						type="submit"
						aria-disabled={!form.ready}
						className="border border-control-border bg-chosen px-2 py-0.5 font-semibold text-chosen-foreground aria-disabled:opacity-50"
					>
						{form.pending
							? adding
								? studioText.adding
								: studioText.renaming
							: adding
								? studioText.add
								: studioText.rename}
					</button>
				</div>
			</form>
		</dialog>
	)
}

const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
