import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
	actionText,
	fileMenuActions,
	previewStates,
	projectActions,
	projectActionText,
	studioDelays,
	studioText,
	writeFailures
} from '@linguify/constants'
import {
	type ActionPreview,
	actionDoneText,
	actionPlanText,
	actionPreview,
	errorMessage,
	isComposing,
	writeFailure
} from '@linguify/table'
import type { Revision } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { Checkbox } from '@linguify/ui/components/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@linguify/ui/components/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@linguify/ui/components/dropdown-menu'
import { Label } from '@linguify/ui/components/label'
import { cn } from '@linguify/ui/lib/utils'
import { ChevronDownIcon } from 'lucide-react'
import { checkboxClass, focusRingClass, menuItemClass } from './classes'
import { ignoreComposingEnter } from './composition'
import { trpcClient } from './trpc'
import { WriteNotice } from './write-notice'
import { useFormat, useSync } from './writes'

/**
 * an action the Files menu offers
 */
type FileAction = (typeof fileMenuActions)[number]

/**
 * the whole-project actions the studio offers — sync and format — in a Files menu, each in a dialog; a table
 * is exported and imported from the command line or the editor's palette
 *
 * @param props - `removeUnused`, what the sync dialog starts from — the config's `sync.removeUnused`; `cwd`,
 * the folder the studio runs in, which files are shown from; `revision`, the translations' as last read;
 * `onDone`, what was done, in words
 *
 * @returns the menu, and the dialog open
 */
export const ProjectActions = ({
	removeUnused,
	cwd,
	revision,
	onDone
}: {
	removeUnused: boolean
	cwd: string
	revision: Revision
	onDone: (said: string) => void
}) => {
	const [opened, setOpened] = useState<{ action: FileAction; opening: number }>()
	const menu = useRef<HTMLButtonElement>(null)
	return (
		<>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button ref={menu} id="project-actions" variant="outline" size="sm" className={focusRingClass}>
						{studioText.files}
						<ChevronDownIcon data-icon="inline-end" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{fileMenuActions.map(action => (
						<DropdownMenuItem
							key={action}
							className={menuItemClass}
							onSelect={() => setOpened(current => ({ action, opening: (current?.opening ?? 0) + 1 }))}
						>
							{projectActionText[action].label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			{opened !== undefined && (
				<ActionDialog
					key={opened.opening}
					action={opened.action}
					removeUnusedByDefault={removeUnused}
					cwd={cwd}
					revision={revision}
					onDone={onDone}
					onClosed={() => {
						setOpened(undefined)
						menu.current?.focus()
					}}
				/>
			)}
		</>
	)
}

/**
 * an outcome as the dialog shows it: one summary for the live status, the files and warnings beside it —
 * and the revision it was worked out on, which the run then expects
 */
type Shown = {
	summary: string[]
	files: string[]
	warnings: string[]
	nothing: boolean
	revision: Revision
}

/**
 * what an action would do, worked out before it is done — the last outcome kept while the next is worked out
 */
type Preview =
	| { state: typeof previewStates.working; last: Shown | undefined }
	| { state: typeof previewStates.failed; message: string }
	| ({ state: typeof previewStates.ready } & Shown)

/**
 * one action's dialog: its option, what it would do — worked out by a dry run as the option changes — and
 * the button that does it
 *
 * @note the live status holds the summary alone, so a project of hundreds of files is said in a line and
 * shown in a list that scrolls; while the next outcome is worked out the last one stays, marked busy, so
 * each pause is not said twice. Warnings are always shown, as they need a person even when nothing is
 * written. A write that fails is said here, as the modal keeps the page's toast out of reach, and stays said
 * while the plan is worked out again
 *
 * @note the run expects the revision its plan was worked out on, so it does what was shown or is refused;
 * the plan is worked out again whenever the translations move — the studio's own queued edit landing
 * included — so what is shown is what the run will find
 */
const ActionDialog = ({
	action,
	removeUnusedByDefault,
	cwd,
	revision,
	onDone,
	onClosed
}: {
	action: FileAction
	removeUnusedByDefault: boolean
	cwd: string
	revision: Revision
	onDone: (said: string) => void
	onClosed: () => void
}) => {
	const [open, setOpen] = useState(true)
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<{ error: unknown }>()
	const [removeUnused, setRemoveUnused] = useState(removeUnusedByDefault)
	const [preview, setPreview] = useState<Preview>({ state: previewStates.working, last: undefined })
	const [read, setRead] = useState(0)
	const [queued, setQueued] = useState(false)
	const sync = useSync()
	const formatFiles = useFormat()

	const dryRun = useCallback(async (): Promise<Shown> => {
		const result =
			action === projectActions.sync
				? await trpcClient.sync.mutate({ removeUnused, dryRun: true })
				: await trpcClient.format.mutate({ dryRun: true })
		return { ...shownOf(actionPreview(result, cwd)), revision: result.revision }
	}, [action, removeUnused, cwd])

	// worked out again as the option changes, as the translations move, and after a refresh, which `read`
	// counts
	// biome-ignore lint/correctness/useExhaustiveDependencies: `revision` and `read` ask for the same dry run again
	useEffect(() => {
		let current = true
		setPreview(previous => ({
			state: previewStates.working,
			last:
				previous.state === previewStates.ready
					? previous
					: previous.state === previewStates.working
						? previous.last
						: undefined
		}))
		const timer = setTimeout(() => {
			dryRun()
				.then(shown => {
					if (current) setPreview({ state: previewStates.ready, ...shown })
				})
				.catch((error: unknown) => {
					if (current) setPreview({ state: previewStates.failed, message: errorMessage(error) })
				})
		}, studioDelays.preview)
		return () => {
			current = false
			clearTimeout(timer)
		}
	}, [dryRun, revision, read])

	// a failed write stays said until the option changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: the option clears it
	useEffect(() => setFailure(undefined), [removeUnused])

	const run = async (planned: Shown) => {
		setPending(true)
		setFailure(undefined)
		try {
			const against = planned.revision
			const done =
				action === projectActions.sync ? await sync({ removeUnused, against }) : await formatFiles({ against })
			onDone(actionDoneText(action, actionPreview(done, cwd)))
			setPending(false)
			setOpen(false)
		} catch (error) {
			// reported once for every write — said here too, and, unless the files changed and await a refresh,
			// the plan worked out again
			setFailure({ error })
			if (writeFailure(error) !== writeFailures.stale) setRead(count => count + 1)
			setPending(false)
		}
	}
	const ready = preview.state === previewStates.ready && !preview.nothing && !pending
	const latest = useRef(run)
	latest.current = run
	// pressed while the plan is still worked out: done once it is in, when there is something to do
	useEffect(() => {
		if (!queued || preview.state === previewStates.working) return
		setQueued(false)
		if (ready) void latest.current(preview)
	}, [queued, preview, ready])
	const submit = (event: FormEvent) => {
		event.preventDefault()
		if (pending) return
		if (preview.state === previewStates.working) setQueued(true)
		else if (ready) void run(preview)
	}
	const shown =
		preview.state === previewStates.ready ? preview : preview.state === previewStates.working ? preview.last : undefined

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next && !pending) setOpen(false)
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
				onEscapeKeyDown={event => {
					if (isComposing(event)) event.preventDefault()
				}}
				onCloseAutoFocus={event => {
					event.preventDefault()
					onClosed()
				}}
			>
				<form
					onSubmit={submit}
					onKeyDown={ignoreComposingEnter}
					aria-busy={pending}
					className="flex min-w-0 flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle>{projectActionText[action].title}</DialogTitle>
						<DialogDescription>{projectActionText[action].description}</DialogDescription>
					</DialogHeader>
					{action === projectActions.sync && (
						<div className="flex items-start gap-2">
							<Checkbox
								id={removeUnusedId}
								className={checkboxClass}
								checked={removeUnused}
								disabled={pending}
								onCheckedChange={checked => setRemoveUnused(checked === true)}
							/>
							<Label htmlFor={removeUnusedId} className="font-normal">
								{actionText.removeUnused}
							</Label>
						</div>
					)}
					{failure !== undefined && (
						<WriteNotice
							error={failure.error}
							onRefreshed={() => {
								setFailure(undefined)
								setRead(count => count + 1)
							}}
						/>
					)}
					<div className="flex flex-col gap-2 border p-2 text-xs">
						<div id={previewId} role="status" aria-busy={preview.state === previewStates.working}>
							{preview.state === previewStates.failed && (
								<p className="wrap-anywhere text-destructive">{preview.message}</p>
							)}
							{shown !== undefined &&
								(shown.nothing ? (
									<p className="text-muted-foreground">{actionText.nothingToDo}</p>
								) : (
									shown.summary.map((line, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: the lines are re-derived whole each time
										<p key={index} className="wrap-anywhere">
											{line}
										</p>
									))
								))}
							{shown === undefined && preview.state === previewStates.working && (
								<p className="text-muted-foreground">{studioText.previewing}</p>
							)}
							{queued && <p className="text-muted-foreground">{actionText.stillWorking}</p>}
						</div>
						{shown !== undefined && shown.files.length > 0 && (
							<ul
								aria-label={actionText.files}
								// biome-ignore lint/a11y/noNoninteractiveTabindex: a list that scrolls must be reachable to scroll
								tabIndex={0}
								className={cn('max-h-32 overflow-y-auto font-mono', focusRingClass)}
								dir="ltr"
							>
								{shown.files.map(file => (
									<li key={file} className="wrap-anywhere">
										{file}
									</li>
								))}
							</ul>
						)}
						{shown !== undefined && shown.warnings.length > 0 && (
							<ul className="flex max-h-32 flex-col gap-0.5 overflow-y-auto text-destructive">
								{shown.warnings.map((warning, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: two warnings may say the same
									<li key={index} className="wrap-anywhere">
										{warning}
									</li>
								))}
							</ul>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className={cn(focusRingClass, 'aria-disabled:opacity-50')}
							aria-disabled={pending}
							onClick={() => {
								if (!pending) setOpen(false)
							}}
						>
							{studioText.cancel}
						</Button>
						<Button
							type="submit"
							className={cn(focusRingClass, 'aria-disabled:opacity-50')}
							aria-disabled={!ready && preview.state !== previewStates.working}
							aria-describedby={previewId}
						>
							{pending ? projectActionText[action].pending : projectActionText[action].button}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

/**
 * @param preview - a dry run's outcome
 *
 * @returns it as the dialog shows it: the counts and how many files in the summary, the files listed
 */
const shownOf = (preview: ActionPreview): Omit<Shown, 'revision'> => ({
	summary: actionPlanText(preview),
	files: [...preview.written, ...preview.removed],
	warnings: preview.warnings,
	nothing: preview.nothing
})

/**
 * the id of the sync dialog's option, which its label points to
 */
const removeUnusedId = 'remove-unused'

/**
 * the id of what the action would do — the status the button is described by
 */
const previewId = 'action-preview'
