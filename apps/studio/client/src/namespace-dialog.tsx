import { type FormEvent, useRef, useState } from 'react'
import { compositionKeyCode, keyPathProblemText, namespaceActions, studioDelays, studioText } from '@linguify/constants'
import { checkNamespaceName, type NamespaceAction } from '@linguify/table'
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
import { fill } from './format'
import { useSettled } from './settled'
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
	const renaming = action.kind === namespaceActions.rename ? action.from : undefined
	const [name, setName] = useState(renaming ?? '')
	const [open, setOpen] = useState(true)
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<{ error: unknown }>()
	const field = useRef<HTMLInputElement>(null)
	const written = useRef<NamespaceName | undefined>(undefined)
	const check = checkNamespaceName(catalogue, name, { from: renaming, namespaceFiles })
	const notes = [
		...(name !== '' && check.problem !== undefined ? [keyPathProblemText[check.problem]] : []),
		...(check.taken.length > 0
			? [fill(studioText.duplicate, { locales: check.taken.join(studioText.listSeparator) })]
			: [])
	]
	const spoken = useSettled(notes[0] ?? '', studioDelays.saying)
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (pending) return
		if (!check.ready) {
			// back on the name, which is read with what stands in its way
			field.current?.focus()
			return
		}
		setPending(true)
		setFailure(undefined)
		try {
			await onSubmit(name)
			written.current = name
			setPending(false)
			setOpen(false)
		} catch (error) {
			// reported once for every write, and said here; what was typed stays to try again
			setFailure({ error })
			setPending(false)
		}
	}
	const cancel = () => {
		if (!pending) setOpen(false)
	}
	const adding = renaming === undefined
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
					if (event.isComposing || event.keyCode === compositionKeyCode) event.preventDefault()
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
						<DialogTitle className="wrap-anywhere">
							{adding ? studioText.addNamespaceTitle : fill(studioText.renameNamespace, { name: renaming })}
						</DialogTitle>
						<DialogDescription>
							{adding ? studioText.addNamespaceDescription : studioText.renameNamespaceDescription}
						</DialogDescription>
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
							{check.same && <li className="text-muted-foreground">{studioText.namespaceSame}</li>}
						</ul>
						<span role="status" className="sr-only">
							{spoken}
						</span>
					</div>
					{failure !== undefined && (
						<WriteNotice
							error={failure.error}
							onRefreshed={() => {
								// the notice goes, and the keyboard with it: back on the name, to make the change again
								setFailure(undefined)
								field.current?.focus()
							}}
						/>
					)}
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
						<Button
							type="submit"
							className={cn(focusRingClass, 'aria-disabled:opacity-50')}
							aria-disabled={pending || !check.ready}
						>
							{pending
								? adding
									? studioText.adding
									: studioText.renaming
								: adding
									? studioText.add
									: studioText.rename}
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
