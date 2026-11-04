import { useRef, useState } from 'react'
import { newKeyNotes, studioText } from '@linguify/constants'
import { fill, isComposing, noteText, stopsAdd } from '@linguify/table'
import { useKeyRenameForm } from '@linguify/table/react'
import type { Catalogue, KeyPath, KeyRules } from '@linguify/types'
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
 * asks for a key's new path — the key, or a whole group, moved in every locale with its descriptions — and
 * checks it as it is typed, the way core will
 *
 * @note its behaviour is `useKeyRenameForm`'s, the extension's too: the button does nothing while anything
 * stands in the way, and pressed then, takes the keyboard back to the path; it holds still while it writes,
 * Escape and Cancel waiting; a failure is said in it, the path kept. Mounted afresh for each opening
 *
 * @note on closing, the keyboard goes where `onClosed` puts it — the key's own rename, at its new path
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
	const [open, setOpen] = useState(true)
	const written = useRef<KeyPath | undefined>(undefined)
	const { path, setPath, notes, ready, spoken, pending, failure, refreshed, submit, field } = useKeyRenameForm({
		from,
		catalogue,
		rules,
		onSubmit,
		onWritten: to => {
			written.current = to
			setOpen(false)
		}
	})
	const cancel = () => {
		if (!pending) setOpen(false)
	}
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
						<DialogTitle className="wrap-anywhere">{fill(studioText.renameKey, { key: from })}</DialogTitle>
						<DialogDescription>{studioText.renameKeyDescription}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-1">
						<Label htmlFor={keyPathId}>{studioText.keyPath}</Label>
						<Input
							ref={field}
							id={keyPathId}
							dir="ltr"
							autoComplete="off"
							spellCheck={false}
							readOnly={pending}
							className={cn('font-mono', inputFocusClass)}
							aria-invalid={notes.some(note => stopsAdd(note) && note.kind !== newKeyNotes.same)}
							aria-describedby={keyNotesId}
							value={path}
							onChange={event => setPath(event.target.value)}
						/>
						<ul id={keyNotesId} className="flex flex-col gap-0.5 text-xs">
							{notes.map(note => (
								<li
									key={noteText(note)}
									className={
										note.kind === newKeyNotes.same || !stopsAdd(note) ? 'text-muted-foreground' : 'text-destructive'
									}
								>
									{noteText(note)}
								</li>
							))}
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
							{pending ? studioText.renaming : studioText.rename}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

/**
 * the ids of the path's field and of what stands in its way
 */
const keyPathId = 'key-path'
const keyNotesId = 'key-notes'
