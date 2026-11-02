import { useRef, useState } from 'react'
import { studioText } from '@linguify/constants'
import { isComposing, type NamespaceAction, namespaceDialogText } from '@linguify/table'
import { useNamespaceForm } from '@linguify/table/react'
import type { Catalogue, NamespaceName } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@linguify/ui/components/dialog'
import { Input } from '@linguify/ui/components/input'
import { Label } from '@linguify/ui/components/label'
import { cn } from '@linguify/ui/lib/utils'
import { focusRingClass, inputFocusClass } from './classes'
import { ignoreComposingEnter } from './composition'
import { WriteNotice } from './write-notice'

/**
 * asks for a namespace's name — a new one, or one to rename to — and checks it as it is typed, the way core
 * and the engine will: an unusable name, one already there, and where each namespace is a file, one no file
 * can be named or one differing from another only in case. The button does nothing while any of it
 * stands; the first of it is said aloud once typing pauses, and pressed, the button takes the keyboard back
 * to the name, read with it
 *
 * @note it holds still while it writes, as the bulk delete does: the button pressed again does nothing, and
 * Escape and Cancel wait. A failure is said in it — with its own Refresh when the files changed on disk —
 * and the name is kept. Mounted afresh for each opening, so it starts from the name it renames, or none
 *
 * @note on closing, the keyboard goes where `onClosed` puts it — Radix gives it back only to a trigger of its
 * own, and the button that opened it may now name another namespace
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
	const [open, setOpen] = useState(true)
	const written = useRef<NamespaceName | undefined>(undefined)
	const { renaming, name, setName, notes, same, ready, spoken, pending, failure, refreshed, submit, field } =
		useNamespaceForm({
			action,
			catalogue,
			namespaceFiles,
			onSubmit,
			onWritten: name => {
				written.current = name
				setOpen(false)
			}
		})
	const cancel = () => {
		if (!pending) setOpen(false)
	}
	const said = namespaceDialogText(action, pending)
	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next) cancel()
			}}
		>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={event => {
					if (isComposing(event)) event.preventDefault()
				}}
				onCloseAutoFocus={event => {
					event.preventDefault()
					onClosed(written.current)
				}}
			>
				<form
					onSubmit={submit}
					onKeyDown={ignoreComposingEnter}
					aria-busy={pending}
					className="flex min-w-0 flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle className="wrap-anywhere">{said.title}</DialogTitle>
						<DialogDescription>{said.description}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-1">
						<Label htmlFor="namespace-name">{studioText.namespaceName}</Label>
						<Input
							ref={field}
							id="namespace-name"
							dir="ltr"
							autoComplete="off"
							spellCheck={false}
							readOnly={pending}
							className={cn('font-mono', inputFocusClass)}
							aria-invalid={notes.length > 0}
							aria-describedby={namespaceNotesId}
							value={name}
							onChange={event => setName(event.target.value)}
						/>
						<ul id={namespaceNotesId} className="flex flex-col gap-0.5 text-xs">
							{notes.map(note => (
								<li key={note} className="text-destructive">
									{note}
								</li>
							))}
							{same && <li className="text-muted-foreground">{studioText.namespaceSame}</li>}
						</ul>
						<span role="status" className="sr-only">
							{spoken}
						</span>
					</div>
					{failure !== undefined && <WriteNotice error={failure.error} onRefreshed={refreshed} />}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className={cn(focusRingClass, 'aria-disabled:opacity-50')}
							aria-disabled={pending}
							onClick={cancel}
						>
							{studioText.cancel}
						</Button>
						<Button type="submit" className={cn(focusRingClass, 'aria-disabled:opacity-50')} aria-disabled={!ready}>
							{said.button}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

/**
 * the id of what stands in the name's way, which the field points to
 */
const namespaceNotesId = 'namespace-notes'
