import { type KeyboardEvent, memo, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
	rowKinds,
	selectionStates,
	sortColumns,
	sortDirections,
	studioText,
	tableMarkClasses,
	tableMarkLabels,
	tableMarks,
	viewModes
} from '@linguify/constants'
import {
	canExpand,
	cellMark,
	type Expansion,
	isExpanded,
	type KeyEdit,
	type KeySort,
	type KeyTableRow,
	localeOrder,
	type TableRow as Row,
	type RowSource,
	rowFeatures,
	rowOptionsFor,
	type Selection,
	type SelectionState,
	sameColumn,
	selectionState,
	shownState,
	toExpandedState
} from '@linguify/table'
import type { Locale, NamespaceName, TableMark, ViewMode } from '@linguify/types'
import { Checkbox } from '@linguify/ui/components/checkbox'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@linguify/ui/components/table'
import { Textarea } from '@linguify/ui/components/textarea'
import { cn } from '@linguify/ui/lib/utils'
import { tableFeatures, useTable } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronRightIcon, PencilIcon } from 'lucide-react'
import { checkboxClass, plainButtonClass, plainFocusClass, textWidthClass } from './classes'
import { countKeys, fill } from './format'

/**
 * the translation table: a section per namespace, groups in the tree view, a row per key, its texts and
 * description changed in place, a checkbox on every row to select keys for a bulk delete
 *
 * @note a plain `<table>`, not the UI package's `Table`, which wraps it in a box that scrolls sideways —
 * that box would hold the sticky column heads instead of the page's scrolling middle. Each text is
 * bounded on a block inside its cell, as `max-width` on a `<td>` is only a hint, and reads in its own
 * direction, so Kurdish Sorani runs right to left inside the left-to-right table
 *
 * @param props - `rows`, built for `mode`; `source`, the project's locales and whether descriptions are
 * on; `expansion`, which rows are open; `onToggle`, to open or close one by id, which should not change
 * between renders — every row that did not change is then left as it is; `sort`, how the rows are ordered,
 * and `onSort`, a column's header pressed; `onEdit`, a text changed in a cell, settled once it is written;
 * `selection`, the keys selected, `onSelect`, a row's checkbox pressed, and `onSelectAll`, the head's
 * checkbox pressed — both should not change between renders, as `onToggle`
 *
 * @returns the table
 */
export const TranslationTable = memo(function TranslationTable({
	rows,
	mode,
	source,
	expansion,
	onToggle,
	sort,
	onSort,
	onEdit,
	selection,
	onSelect,
	onSelectAll,
	onRename
}: {
	rows: Row[]
	mode: ViewMode
	source: RowSource
	expansion: Expansion
	onToggle: (id: string) => void
	sort: KeySort | undefined
	onSort: (column: KeySort['column']) => void
	onEdit: (edit: KeyEdit) => Promise<unknown>
	selection: Selection
	onSelect: (row: Row) => void
	onSelectAll: () => void
	onRename: (namespace: NamespaceName) => void
}) {
	const expanded = useMemo(() => toExpandedState(expansion, rows, mode), [expansion, rows, mode])
	const tableRef = useRef<HTMLTableElement>(null)
	useLayoutEffect(() => {
		const table = tableRef.current
		if (table !== null && table.querySelector(rovingControl) === null)
			(table.querySelector(editableText) ?? table.querySelector(cellControl))?.setAttribute('tabindex', '0')
	})
	const table = useTable({
		features: tableFeatures(rowFeatures),
		columns: [],
		data: rows,
		...rowOptionsFor(mode),
		state: { expanded }
	})
	const compact = mode === viewModes.compact
	const descriptions = source.descriptions && !compact
	const locales = useMemo(() => localeOrder(source), [source])
	const shown = useMemo(() => (compact ? locales.slice(0, 1) : locales), [compact, locales])
	const columns = 1 + (descriptions ? 1 : 0) + shown.length
	return (
		<>
			<span id={sortHintId} hidden>
				{studioText.sortHint}
			</span>
			<span id={editHintIds.open} hidden>
				{studioText.editHint}
			</span>
			<span id={editHintIds.keys} hidden>
				{studioText.editKeys}
			</span>
			<table
				ref={tableRef}
				onFocus={event => rove(event.currentTarget, event.target)}
				onKeyDown={moveBetweenControls}
				id={translationsId}
				aria-label={studioText.translations}
				className="w-full caption-bottom text-xs"
			>
				<TableHeader className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_var(--color-border)]">
					<TableRow>
						<TableHead className="w-0" data-select>
							<Checkbox
								aria-label={studioText.selectShown}
								className={checkboxClass}
								checked={checkboxState(shownState(selection, rows))}
								onCheckedChange={onSelectAll}
							/>
						</TableHead>
						<SortableHead column={{ by: sortColumns.key }} sort={sort} onSort={onSort}>
							{studioText.key}
						</SortableHead>
						{descriptions && <TableHead>{studioText.description}</TableHead>}
						{shown.map(locale => (
							<SortableHead key={locale} column={{ by: sortColumns.locale, locale }} sort={sort} onSort={onSort}>
								{locale}
								{locale === source.default && (
									<>
										{' '}
										<span className="font-normal text-muted-foreground">{studioText.defaultLocale}</span>
									</>
								)}
							</SortableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{table
						.getRowModel()
						.rows.map(({ id, depth, original }) =>
							original.kind === rowKinds.key ? (
								<KeyLine
									key={id}
									row={original}
									depth={depth}
									locales={locales}
									shown={shown}
									defaultLocale={source.default}
									descriptions={source.descriptions}
									compact={compact}
									open={compact && isExpanded(expansion, id)}
									onToggle={onToggle}
									onEdit={onEdit}
									selected={selection.has(original.key)}
									onSelect={onSelect}
								/>
							) : (
								<GroupLine
									key={id}
									row={original}
									depth={depth}
									columns={columns}
									open={canExpand(mode, original) && isExpanded(expansion, id)}
									onToggle={onToggle}
									state={selectionState(selection, original)}
									onSelect={onSelect}
									onRename={onRename}
								/>
							)
						)}
				</TableBody>
			</table>
		</>
	)
})

/**
 * the table's id
 */
export const translationsId = 'translations'

/**
 * every control in the table's cells — a key's checkbox, a text a person can open — the texts alone, and the
 * one the keyboard reaches the table on, a text when there is one, so the hint on moving is heard on the way in
 */
const cellControl = '[data-cell]'
const editableText = '[data-edit]'
const rovingControl = '[data-cell][tabindex="0"]'

/**
 * the table's columns that are not a locale's, as the keyboard tells them apart
 */
const fixedColumns = { select: 'select', description: 'description' } as const

/**
 * how a row says it is selected — the state the table primitive styles
 */
export const selectedRow = 'selected'

/**
 * @param id - a row's id
 *
 * @returns the selector of that row in the table
 */
export const rowSelector = (id: string): string => `#${translationsId} tr[data-row="${CSS.escape(id)}"]`

/**
 * gives the keyboard to the table, on its one stop for Tab
 *
 * @returns whether there was a stop to give it to — none when the table shows nothing
 */
export const focusTableStop = (): boolean => {
	const stop = document.querySelector<HTMLElement>(`#${translationsId} ${rovingControl}`)
	stop?.focus()
	return stop !== null
}

/**
 * makes the control just focused the table's one stop for Tab — all the others are reached with the arrow keys,
 * so the table is one step in the page however many texts it holds
 *
 * @param table - the table
 * @param target - what was focused
 */
const rove = (table: HTMLElement, target: EventTarget) => {
	if (!(target instanceof HTMLElement) || !target.matches(cellControl)) return
	for (const other of table.querySelectorAll(rovingControl)) other.setAttribute('tabindex', '-1')
	target.setAttribute('tabindex', '0')
}

/**
 * @param control - a control in a cell
 *
 * @returns its column: the checkboxes', a locale, or the description
 */
const columnOf = (control: Element): string =>
	control.closest('[data-select]') !== null
		? fixedColumns.select
		: (control.closest('[data-locale]')?.getAttribute('data-locale') ??
			(control.closest('[data-description]') === null ? '' : fixedColumns.description))

/**
 * moves the keyboard between the cells' controls: left and right along a row, up and down a column, Home
 * and End to a row's ends
 *
 * @param event - a key pressed in the table
 */
const moveBetweenControls = (event: KeyboardEvent<HTMLTableElement>) => {
	const from = event.target
	if (!(from instanceof HTMLElement) || !from.matches(cellControl)) return
	const texts = [...event.currentTarget.querySelectorAll<HTMLElement>(cellControl)]
	const at = texts.indexOf(from)
	const row = from.closest('tr')
	const sameRow = texts.filter(text => text.closest('tr') === row)
	const column = columnOf(from)
	const to =
		event.key === 'ArrowRight'
			? sameRow[sameRow.indexOf(from) + 1]
			: event.key === 'ArrowLeft'
				? sameRow[sameRow.indexOf(from) - 1]
				: event.key === 'ArrowDown'
					? texts.slice(at + 1).find(text => text.closest('tr') !== row && columnOf(text) === column)
					: event.key === 'ArrowUp'
						? texts
								.slice(0, at)
								.reverse()
								.find(text => text.closest('tr') !== row && columnOf(text) === column)
						: event.key === 'Home'
							? sameRow[0]
							: event.key === 'End'
								? sameRow.at(-1)
								: undefined
	if (to === undefined) return
	event.preventDefault()
	to.focus()
}

/**
 * a column's header that orders the table by it when pressed — on screen only
 *
 * @note the button is named by the header's own words, and described by what sorting does; `aria-sort`
 * is on the sorted header only
 */
const SortableHead = ({
	column,
	sort,
	onSort,
	children
}: {
	column: KeySort['column']
	sort: KeySort | undefined
	onSort: (column: KeySort['column']) => void
	children: ReactNode
}) => {
	const direction = sort !== undefined && sameColumn(sort.column, column) ? sort.direction : undefined
	const Icon = direction === undefined ? ArrowUpDownIcon : sortIcons[direction]
	return (
		<TableHead aria-sort={direction}>
			<button
				type="button"
				aria-describedby={sortHintId}
				onClick={() => onSort(column)}
				className={cn('items-center', plainButtonClass)}
			>
				<span>{children}</span>
				<Icon className={cn('size-3.5 shrink-0', direction === undefined && 'text-muted-foreground')} />
			</button>
		</TableHead>
	)
}

/**
 * the arrow a sorted column's header shows
 */
const sortIcons = {
	[sortDirections.ascending]: ArrowUpIcon,
	[sortDirections.descending]: ArrowDownIcon
}

/**
 * the id of the words every sortable header points to: what sorting does, and does not
 */
const sortHintId = 'sort-hint'

/**
 * @param depth - how deep a row sits
 *
 * @returns how far its first cell is indented
 */
const indent = (depth: number) => `calc(var(--spacing) * ${2 + depth * 4})`

/**
 * @param state - how much of a row is selected
 *
 * @returns what its checkbox shows: ticked, a dash, or empty
 */
const checkboxState = (state: SelectionState): boolean | 'indeterminate' =>
	state === selectionStates.all ? true : state === selectionStates.some ? 'indeterminate' : false

/**
 * a button that opens and closes a row, its chevron turning with it
 */
const Disclosure = ({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: ReactNode }) => (
	<button
		type="button"
		tabIndex={-1}
		data-cell
		data-disclosure
		aria-expanded={open}
		onClick={onToggle}
		className={cn('items-start', plainButtonClass)}
	>
		<ChevronRightIcon className="mt-px size-3.5 shrink-0 in-aria-expanded:rotate-90 transition-transform" />
		{children}
	</button>
)

/**
 * a namespace's section, or a group of the tree view: one header cell across the row, which opens and
 * closes it
 */
const GroupLine = memo(
	({
		row,
		depth,
		columns,
		open,
		onToggle,
		state,
		onSelect,
		onRename
	}: {
		row: Exclude<Row, KeyTableRow>
		depth: number
		columns: number
		open: boolean
		onToggle: (id: string) => void
		state: SelectionState
		onSelect: (row: Row) => void
		onRename: (namespace: NamespaceName) => void
	}) => {
		const heading = (
			<>
				<span className={cn(row.kind === rowKinds.section && 'font-semibold')}>
					{row.kind === rowKinds.section ? row.namespace : row.label}
				</span>
				<span className="text-muted-foreground">{countKeys(row.keys)}</span>
			</>
		)
		return (
			<TableRow data-row={row.id} data-state={state === selectionStates.all ? selectedRow : undefined}>
				<TableCell data-select>
					{row.keys > 0 && (
						<Checkbox
							tabIndex={-1}
							data-cell
							aria-label={fill(studioText.selectGroup, {
								name: row.kind === rowKinds.section ? row.namespace : row.path
							})}
							className={checkboxClass}
							checked={checkboxState(state)}
							onCheckedChange={() => onSelect(row)}
						/>
					)}
				</TableCell>
				<TableHead
					scope="rowgroup"
					colSpan={columns}
					className="h-auto py-2 font-normal"
					style={{ paddingInlineStart: indent(depth) }}
				>
					{row.keys > 0 ? (
						<Disclosure open={open} onToggle={() => onToggle(row.id)}>
							{heading}
						</Disclosure>
					) : (
						// a namespace holding no key has nothing to open or select: its name, said as it is
						<span className="inline-flex gap-1 ps-4.5">{heading}</span>
					)}
					{row.kind === rowKinds.section && (
						<button
							type="button"
							tabIndex={-1}
							data-cell
							data-rename
							aria-label={fill(studioText.renameNamespace, { name: row.namespace })}
							title={fill(studioText.renameNamespace, { name: row.namespace })}
							onClick={() => onRename(row.namespace)}
							className={cn('ms-2 inline-flex align-middle text-muted-foreground', plainButtonClass)}
						>
							<PencilIcon className="size-3.5" />
						</button>
					)}
				</TableHead>
			</TableRow>
		)
	}
)

/**
 * one key: its path as the row's header, its description, and its text in each shown locale — in compact
 * view, opened, the description and every other locale inside the same row
 */
const KeyLine = memo(
	({
		row,
		depth,
		locales,
		shown,
		defaultLocale,
		descriptions,
		compact,
		open,
		onToggle,
		onEdit,
		selected,
		onSelect
	}: {
		row: KeyTableRow
		depth: number
		locales: readonly Locale[]
		shown: readonly Locale[]
		defaultLocale: Locale
		descriptions: boolean
		compact: boolean
		open: boolean
		onToggle: (id: string) => void
		onEdit: (edit: KeyEdit) => Promise<unknown>
		selected: boolean
		onSelect: (row: Row) => void
	}) => {
		const label = <KeyLabel row={row} />
		const description = (
			<Editable
				text={row.description ?? ''}
				label={fill(studioText.editLabel, { column: studioText.description, key: row.key })}
				onCommit={text => onEdit({ key: row.key, description: text })}
			>
				{row.description === undefined || row.description === '' ? (
					<span className="sr-only">{studioText.noDescription}</span>
				) : (
					<Text text={row.description} />
				)}
			</Editable>
		)
		const value = (locale: Locale) => (
			<Editable
				text={row.values[locale] ?? ''}
				lang={locale}
				label={fill(studioText.editLabel, { column: locale, key: row.key })}
				onCommit={text => onEdit({ key: row.key, locale, text })}
			>
				<Value row={row} locale={locale} defaultLocale={defaultLocale} />
			</Editable>
		)
		return (
			<TableRow data-row={row.id} data-state={selected ? selectedRow : undefined}>
				<TableCell className="align-top" data-select>
					<Checkbox
						tabIndex={-1}
						data-cell
						aria-label={fill(studioText.select, { key: row.key })}
						className={checkboxClass}
						checked={selected}
						onCheckedChange={() => onSelect(row)}
					/>
				</TableCell>
				<TableHead
					scope="row"
					title={row.key}
					className="h-auto py-2 align-top font-mono font-normal"
					style={{ paddingInlineStart: indent(depth) }}
				>
					{compact ? (
						<Disclosure open={open} onToggle={() => onToggle(row.id)}>
							{label}
						</Disclosure>
					) : (
						label
					)}
				</TableHead>
				{descriptions && !compact && (
					<TableCell className="align-top text-muted-foreground" data-description>
						{description}
					</TableCell>
				)}
				{shown.map(locale => (
					<TableCell key={locale} className="align-top" data-locale={locale}>
						{value(locale)}
						{open && (
							<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
								{descriptions && (
									<>
										<dt className="text-muted-foreground">{studioText.description}</dt>
										<dd className="text-muted-foreground" data-description>
											{description}
										</dd>
									</>
								)}
								{locales.slice(1).map(other => (
									<div key={other} className="contents" data-locale={other}>
										<dt className="text-muted-foreground">{other}</dt>
										<dd>{value(other)}</dd>
									</div>
								))}
							</dl>
						)}
					</TableCell>
				))}
			</TableRow>
		)
	}
)

/**
 * a text the table lets a person change in place: shown as a button, a click or Enter opens it, Enter
 * saves, Shift+Enter starts a new line, Escape cancels, and leaving it saves a change
 *
 * @note the editor takes the text's own box — no padding, no border, a ring that takes no room — so opening
 * it moves nothing, and a click meant for the next text lands there. Only Enter and Escape give the
 * keyboard back to the text; leaving by Tab or a click goes where the person meant
 *
 * @note it remembers the text it opened on. Should the files bring another while it is open — a refresh
 * after a stale write — that text is shown under the editor, and only Enter saves over it: leaving does not
 *
 * @note what was typed stays while the write is under way and when it fails, and one write is never sent
 * twice — not by a second Enter, nor by leaving after a failure with nothing changed since
 */
const Editable = ({
	text,
	lang,
	label,
	onCommit,
	children
}: {
	text: string
	lang?: Locale
	label: string
	onCommit: (text: string) => Promise<unknown>
	children: ReactNode
}) => {
	const [draft, setDraft] = useState<string>()
	const [base, setBase] = useState(text)
	const [saving, setSaving] = useState(false)
	const editing = useRef(false)
	const pending = useRef(false)
	const failed = useRef<string | undefined>(undefined)
	const button = useRef<HTMLButtonElement>(null)
	const [roving, setRoving] = useState(false)
	const changed = draft !== undefined && text !== base
	if (draft !== undefined && changed && draft === base) {
		// nothing typed yet: the text from the files is simply the new start
		setBase(text)
		setDraft(text)
	}
	const close = (giveBack: boolean) => {
		editing.current = false
		failed.current = undefined
		setDraft(undefined)
		if (giveBack) requestAnimationFrame(() => button.current?.focus())
	}
	const commit = async (typed: string, how: 'enter' | 'leave') => {
		if (!editing.current || pending.current) return
		if (how === 'leave' && (changed || typed === failed.current)) return
		if (typed === text) return close(how === 'enter')
		pending.current = true
		setSaving(true)
		try {
			await onCommit(typed)
			close(how === 'enter')
		} catch {
			// reported once for every write; what was typed stays to try again
			failed.current = typed
			setBase(text)
		} finally {
			pending.current = false
			setSaving(false)
		}
	}
	if (draft === undefined)
		return (
			<button
				ref={button}
				type="button"
				tabIndex={roving ? 0 : -1}
				data-edit
				data-cell
				aria-describedby={editHintIds.open}
				onClick={event => {
					setRoving(event.currentTarget.tabIndex === 0)
					editing.current = true
					setBase(text)
					setDraft(text)
				}}
				className={cn('block min-h-5 w-full text-start', plainFocusClass)}
			>
				{children}
				<span className="sr-only">{`, ${label}`}</span>
			</button>
		)
	return (
		<>
			<Textarea
				autoFocus
				data-editor
				value={draft}
				dir="auto"
				lang={lang}
				aria-label={label}
				aria-describedby={changed ? `${editHintIds.keys} ${editHintIds.onDisk}` : editHintIds.keys}
				aria-invalid={changed}
				aria-busy={saving}
				readOnly={saving}
				className={cn(
					'field-sizing-content min-h-0 resize-none rounded-none border-0 p-0 shadow-none ring-2 ring-ring focus-visible:ring-2 focus-visible:ring-ring',
					textWidthClass
				)}
				onFocus={event => event.currentTarget.select()}
				onChange={event => setDraft(event.target.value)}
				onKeyDown={event => {
					const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === imeKeyCode
					if (composing) return
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()
						setBase(text)
						void commit(draft, 'enter')
					} else if (event.key === 'Escape' && !saving) {
						event.preventDefault()
						close(true)
					}
				}}
				onBlur={() => void commit(draft, 'leave')}
			/>
			{changed && (
				<span id={editHintIds.onDisk} role="status" className="mt-1 block text-muted-foreground" dir="auto">
					{fill(studioText.onDisk, { text })}
				</span>
			)}
		</>
	)
}

/**
 * the key code a browser gives a key press that ends a composition — Safari's Enter after an input method
 * commits its text, which must not save
 */
const imeKeyCode = 229

/**
 * the ids of the words an editable text points to
 */
const editHintIds = {
	/**
	 * how to open it, and move between them
	 */
	open: 'edit-hint',

	/**
	 * open, which keys do what
	 */
	keys: 'edit-keys',

	/**
	 * open, the text the files brought meanwhile
	 */
	onDisk: 'edit-on-disk'
}

/**
 * a key's label, bounded and wrapping anywhere — a dotted path has no spaces to break at. Where it shows
 * less than the whole path, a screen reader is given the whole path instead
 */
const KeyLabel = ({ row }: { row: KeyTableRow }) =>
	row.label === row.key ? (
		<span data-label className={keyLabelClass}>
			{row.label}
		</span>
	) : (
		<>
			<span className="sr-only">{row.key}</span>
			<span data-label aria-hidden="true" className={keyLabelClass}>
				{row.label}
			</span>
		</>
	)

/**
 * the key label's block: as wide as a text's, and wrapping anywhere
 */
const keyLabelClass = `wrap-anywhere block whitespace-normal ${textWidthClass}`

/**
 * a key's text in one locale, and its mark when the text alone does not say enough
 */
const Value = ({ row, locale, defaultLocale }: { row: KeyTableRow; locale: Locale; defaultLocale: Locale }) => {
	const mark = cellMark(row, locale, defaultLocale)
	const text = mark === undefined || mark === tableMarks.extra ? row.values[locale] : undefined
	return (
		<>
			{text !== undefined && text !== '' && <Text text={text} lang={locale} />}
			{mark !== undefined && <Mark mark={mark} />}
		</>
	)
}

/**
 * text from the files: bounded inside its cell, wrapping, and in its own direction
 */
const Text = ({ text, lang }: { text: string | undefined; lang?: Locale }) =>
	text === undefined ? null : (
		<span data-text dir="auto" lang={lang} className={cn('block whitespace-pre-wrap break-words', textWidthClass)}>
			{text}
		</span>
	)

/**
 * a mark, drawn as constants say — an absent key's dash spoken as words
 */
const Mark = ({ mark }: { mark: TableMark }) =>
	mark === tableMarks.absent ? (
		<span className={tableMarkClasses[mark]} title={studioText.absent}>
			<span aria-hidden="true">{tableMarkLabels[mark]}</span>
			<span className="sr-only">{studioText.absent}</span>
		</span>
	) : (
		<span
			data-mark={mark}
			className={cn('inline-block px-1 text-[0.625rem] uppercase tracking-wide', tableMarkClasses[mark])}
		>
			{tableMarkLabels[mark]}
		</span>
	)
