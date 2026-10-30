import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
	actionText,
	changeKindText,
	ioDefaultPaths,
	ioFormats,
	previewStates,
	projectActions,
	projectActionText,
	studioDelays,
	studioText
} from '@linguify/constants'
import { type ActionPreview, actionPreview, isIoFormat, relativePath } from '@linguify/table'
import type { IoFormat, ProjectAction } from '@linguify/types'
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
import { Input } from '@linguify/ui/components/input'
import { Label } from '@linguify/ui/components/label'
import { ToggleGroup, ToggleGroupItem } from '@linguify/ui/components/toggle-group'
import { cn } from '@linguify/ui/lib/utils'
import { ChevronDownIcon } from 'lucide-react'
import { checkboxClass, focusRingClass, inputFocusClass, menuItemClass, switchItemClass } from './classes'
import { countFiles, countKeys, fill, numbers } from './format'
import { StaleNotice } from './stale-notice'
import { trpcClient } from './trpc'
import { errorMessage, isStaleWrite } from './write-errors'
import { useExport, useFormat, useImport, useSync } from './writes'

/**
 * what the dialogs start from: the config's `sync.removeUnused` and `io.format`
 */
type ActionDefaults = { removeUnused: boolean; format: IoFormat }

/**
 * the whole-project actions — sync, format, import, export — in a Files menu, each in a dialog
 *
 * @param props - `defaults`; `cwd`, the folder the studio runs in, which paths are typed and shown from;
 * `onDone`, what was done, in words
 *
 * @returns the menu, and the dialog open
 */
export const ProjectActions = ({
	defaults,
	cwd,
	onDone
}: {
	defaults: ActionDefaults
	cwd: string
	onDone: (said: string) => void
}) => {
	const [opened, setOpened] = useState<{ action: ProjectAction; opening: number }>()
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
				<DropdownMenuContent align="start">
					{Object.values(projectActions).map(action => (
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
					defaults={defaults}
					cwd={cwd}
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
 * an outcome as the dialog shows it: one summary for the live status, the files and warnings beside it
 */
type Shown = { summary: string[]; files: string[]; warnings: string[]; nothing: boolean }

/**
 * what an action would do, worked out before it is done — the last outcome kept while the next is worked out
 */
type Preview =
	| { state: typeof previewStates.working; last: Shown | undefined }
	| { state: typeof previewStates.failed; message: string }
	| ({ state: typeof previewStates.ready } & Shown)

/**
 * one action's dialog: its options, what it would do — worked out by a dry run as the options change — and
 * the button that does it
 *
 * @note the live status holds the summary alone, so a project of hundreds of files is said in a line and
 * shown in a list that scrolls; while the next outcome is worked out the last one stays, marked busy, so
 * each pause in typing is not said twice. Warnings are always shown, as they need a person even when
 * nothing is written. A write that fails is said here, as the modal keeps the page's toast out of reach
 */
const ActionDialog = ({
	action,
	defaults,
	cwd,
	onDone,
	onClosed
}: {
	action: ProjectAction
	defaults: ActionDefaults
	cwd: string
	onDone: (said: string) => void
	onClosed: () => void
}) => {
	const [open, setOpen] = useState(true)
	const [pending, setPending] = useState(false)
	const [stale, setStale] = useState(false)
	const [removeUnused, setRemoveUnused] = useState(defaults.removeUnused)
	const [format, setFormat] = useState(defaults.format)
	const [path, setPath] = useState<string>(ioDefaultPaths[defaults.format])
	const [preview, setPreview] = useState<Preview>({ state: previewStates.working, last: undefined })
	const [read, setRead] = useState(0)
	const [queued, setQueued] = useState(false)
	const sync = useSync()
	const formatFiles = useFormat()
	const importTable = useImport()
	const exportTable = useExport()
	const table = action === projectActions.import || action === projectActions.export
	const target = path.trim()

	const dryRun = useCallback(async (): Promise<Shown> => {
		if (action === projectActions.export) {
			const result = await trpcClient.export.mutate({ format, path: target, dryRun: true })
			const plan = fill(actionText.exportPlan, { keys: countKeys(result.rows), path: relativePath(cwd, result.path) })
			return { summary: [plan], files: [], warnings: [], nothing: false }
		}
		const plans = {
			[projectActions.sync]: () => trpcClient.sync.mutate({ removeUnused, dryRun: true }),
			[projectActions.format]: () => trpcClient.format.mutate({ dryRun: true }),
			[projectActions.import]: () => trpcClient.import.mutate({ format, path: target, dryRun: true })
		}
		return shownOf(actionPreview(await plans[action](), cwd))
	}, [action, removeUnused, format, target, cwd])

	// worked out again as the options change, and after a refresh, which `read` counts
	// biome-ignore lint/correctness/useExhaustiveDependencies: `read` asks for the same dry run again
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
		if (table && target === '') {
			setPreview({ state: previewStates.failed, message: actionText.nameAFile })
			return
		}
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
	}, [dryRun, read, table, target])

	const run = async () => {
		setPending(true)
		setStale(false)
		try {
			if (action === projectActions.export) {
				const result = await exportTable({ format, path: target })
				onDone(
					fill(projectActionText.export.done, {
						keys: countKeys(result.rows),
						path: relativePath(cwd, result.path)
					})
				)
			} else {
				const runs = {
					[projectActions.sync]: () => sync({ removeUnused }),
					[projectActions.format]: () => formatFiles(null),
					[projectActions.import]: () => importTable({ format, path: target })
				}
				const done = actionPreview(await runs[action](), cwd)
				const counts = summary(done)
				onDone(
					fill(projectActionText[action].done, {
						summary:
							counts.length > 0
								? counts.join(studioText.listSeparator)
								: countFiles(done.written.length + done.removed.length)
					})
				)
			}
			setPending(false)
			setOpen(false)
		} catch (error) {
			// reported once for every write — said here too, and the plan worked out again
			if (isStaleWrite(error)) setStale(true)
			else {
				setPreview({ state: previewStates.failed, message: errorMessage(error) })
				setRead(count => count + 1)
			}
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
		if (ready) void latest.current()
	}, [queued, preview, ready])
	const submit = (event: FormEvent) => {
		event.preventDefault()
		if (pending) return
		if (preview.state === previewStates.working) setQueued(true)
		else if (ready) void run()
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
				onCloseAutoFocus={event => {
					event.preventDefault()
					onClosed()
				}}
			>
				<form onSubmit={submit} aria-busy={pending} className="flex min-w-0 flex-col gap-4">
					<DialogHeader>
						<DialogTitle>{projectActionText[action].title}</DialogTitle>
						<DialogDescription>{projectActionText[action].description}</DialogDescription>
					</DialogHeader>
					{action === projectActions.sync && (
						<div className="flex items-start gap-2">
							<Checkbox
								id={fieldIds.removeUnused}
								className={checkboxClass}
								checked={removeUnused}
								disabled={pending}
								onCheckedChange={checked => setRemoveUnused(checked === true)}
							/>
							<Label htmlFor={fieldIds.removeUnused} className="font-normal">
								{actionText.removeUnused}
							</Label>
						</div>
					)}
					{table && (
						<>
							<div className="flex flex-col gap-1">
								<Label id={fieldIds.format}>{actionText.tableFormat}</Label>
								<ToggleGroup
									type="single"
									variant="outline"
									size="sm"
									spacing={0}
									aria-labelledby={fieldIds.format}
									value={format}
									onValueChange={value => {
										if (!isIoFormat(value) || pending) return
										// a path still the default follows the format; one typed stays
										if (path === ioDefaultPaths[format]) setPath(ioDefaultPaths[value])
										setFormat(value)
									}}
								>
									{Object.values(ioFormats).map(name => (
										<ToggleGroupItem key={name} value={name} className={switchItemClass}>
											{name}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor={fieldIds.path}>{studioText.tablePath}</Label>
								<Input
									id={fieldIds.path}
									dir="ltr"
									autoComplete="off"
									spellCheck={false}
									readOnly={pending}
									className={cn('font-mono', inputFocusClass)}
									aria-invalid={preview.state === previewStates.failed}
									aria-describedby={previewId}
									value={path}
									onChange={event => {
										const typed = event.target.value
										setPath(typed)
										// a file typed with a table's extension sets the format, as the format sets the file
										const extension = typed.trim().split('.').pop()
										if (typed.includes('.') && isIoFormat(extension)) setFormat(extension)
									}}
								/>
							</div>
						</>
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
					{stale && (
						<StaleNotice
							onRefreshed={() => {
								setStale(false)
								setRead(count => count + 1)
							}}
						/>
					)}
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
 * @param preview - a run's outcome
 *
 * @returns how many keys of each kind changed, in words
 */
const summary = (preview: ActionPreview): string[] =>
	preview.counts.map(({ kind, count }) => fill(changeKindText[kind], { count: numbers.format(count) }))

/**
 * @param preview - a dry run's outcome
 *
 * @returns it as the dialog shows it: the counts and how many files in the summary, the files listed
 */
const shownOf = (preview: ActionPreview): Shown => ({
	summary: [
		...summary(preview),
		...(preview.written.length > 0 ? [fill(actionText.writes, { files: countFiles(preview.written.length) })] : []),
		...(preview.removed.length > 0 ? [fill(actionText.removes, { files: countFiles(preview.removed.length) })] : [])
	],
	files: [...preview.written, ...preview.removed],
	warnings: preview.warnings,
	nothing: preview.nothing
})

/**
 * the ids of the dialog's fields, which their labels point to
 */
const fieldIds = {
	removeUnused: 'remove-unused',
	format: 'table-format',
	path: 'table-path'
}

/**
 * the id of what the action would do — the status the path field and the button are described by
 */
const previewId = 'action-preview'
