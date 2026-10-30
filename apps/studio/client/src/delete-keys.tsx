import { useRef, useState } from 'react'
import { studioText } from '@linguify/constants'
import type { KeyPath, Locale } from '@linguify/types'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@linguify/ui/components/alert-dialog'
import { cn } from '@linguify/ui/lib/utils'
import { destructiveClass, focusRingClass } from './classes'
import { countKeys, fill, numbers } from './format'
import { StaleNotice } from './stale-notice'
import { isStaleWrite } from './write-errors'

/**
 * asks before a bulk delete: how many keys, which, from which locales — and how many of them the filter
 * hides, which go too
 *
 * @note it holds still while the keys are written away: Delete pressed again does nothing, and Cancel and
 * Escape wait, so nothing is deleted after a person cancelled. A failure leaves it open, where it was
 * asked; refused because the files changed on disk, it says so with its own Refresh. On closing, the
 * keyboard goes where `onCancelled` or `onDeleted` puts it — Radix gives it back only to a trigger of its
 * own
 *
 * @note the list is one stop for Tab, so the keyboard can scroll it, and shows the first {@link listed}
 * paths — the title says how many there are
 *
 * @param props - `open` and `onOpenChange`; `keys`, the paths to remove, in order; `hidden`, how many of
 * them the view does not show; `locales`, every locale; `onDelete`, settled once removed; `onDeleted` and
 * `onCancelled`, the dialog closed after a delete or without one
 *
 * @returns the dialog
 */
export const DeleteKeys = ({
	open,
	onOpenChange,
	keys,
	hidden,
	locales,
	onDelete,
	onDeleted,
	onCancelled
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	keys: readonly KeyPath[]
	hidden: number
	locales: readonly Locale[]
	onDelete: () => Promise<unknown>
	onDeleted: () => void
	onCancelled: () => void
}) => {
	const [pending, setPending] = useState(false)
	const [stale, setStale] = useState(false)
	const deleteAction = useRef<HTMLButtonElement>(null)
	const done = useRef(false)
	return (
		<AlertDialog
			open={open}
			onOpenChange={next => {
				if (!pending) onOpenChange(next)
			}}
		>
			<AlertDialogContent
				onCloseAutoFocus={event => {
					event.preventDefault()
					const deleted = done.current
					done.current = false
					if (deleted) onDeleted()
					else onCancelled()
				}}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{fill(studioText.deleteTitle, { keys: countKeys(keys.length) })}</AlertDialogTitle>
					<AlertDialogDescription>
						{fill(studioText.deleteDescription, { locales: locales.join(studioText.listSeparator) })}
						{hidden > 0 && <> {fill(studioText.deleteHidden, { keys: countKeys(hidden) })}</>}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<ul
					id="delete-keys"
					// biome-ignore lint/a11y/noNoninteractiveTabindex: a list that scrolls must be reachable to scroll
					tabIndex={0}
					aria-label={studioText.deleteList}
					className={cn('max-h-48 overflow-auto border p-2 font-mono text-xs', focusRingClass)}
					dir="ltr"
				>
					{keys.slice(0, listed).map(key => (
						<li key={key} className="wrap-anywhere">
							{key}
						</li>
					))}
					{keys.length > listed && (
						<li className="font-sans text-muted-foreground">
							{fill(studioText.andMore, { count: numbers.format(keys.length - listed) })}
						</li>
					)}
				</ul>
				{stale && (
					<StaleNotice
						onRefreshed={() => {
							// the notice goes, and the keyboard with it: back on Delete, to delete what is selected now
							setStale(false)
							deleteAction.current?.focus()
						}}
					/>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel className={focusRingClass} aria-disabled={pending}>
						{studioText.cancel}
					</AlertDialogCancel>
					<AlertDialogAction
						ref={deleteAction}
						variant="destructive"
						className={cn(destructiveClass, focusRingClass)}
						aria-disabled={pending}
						onClick={event => {
							event.preventDefault()
							if (pending) return
							setPending(true)
							setStale(false)
							void onDelete().then(
								() => {
									setPending(false)
									done.current = true
									onOpenChange(false)
								},
								error => {
									setStale(isStaleWrite(error))
									setPending(false)
								}
							)
						}}
					>
						{pending ? studioText.deleting : studioText.deleteSelected}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

/**
 * how many paths the confirmation lists before saying how many more there are
 */
const listed = 200
