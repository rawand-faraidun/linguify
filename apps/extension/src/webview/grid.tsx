import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import {
	rowKinds,
	selectionStates,
	sortColumns,
	sortDirections,
	studioText,
	tableId,
	tableMarkClasses,
	tableMarkLabels,
	tableMarks,
	tableTextClasses,
	viewModes
} from '@linguify/constants'
import { localeOrder, type RowSource } from '@linguify/keys'
import {
	canExpand,
	cellMark,
	cellText,
	controlAfter,
	countKeys,
	type Expansion,
	fill,
	isExpanded,
	type KeyEdit,
	type KeySort,
	type KeyTableRow,
	keepTableStop,
	rove,
	rowFeatures,
	rowOptionsFor,
	type Selection,
	type SelectionState,
	sameColumn,
	selectionState,
	shownState,
	type TableRow,
	toExpandedState
} from '@linguify/table'
import { useEditable } from '@linguify/table/react'
import type { Locale, NamespaceName, TableMark, ViewMode } from '@linguify/types'
import { tableFeatures, useTable } from '@tanstack/react-table'

/**
 * the translation grid: the rows `@linguify/table` builds for the view — sections, groups, keys — with the
 * default locale first and each text marked as the studio marks it, in the editor's own colours
 *
 * @note few nodes a row, as the studio's measurements at 20,000 keys taught: plain cells, no component per
 * text. Its head sticks to the top of the box it scrolls in. The keyboard moves as in the studio, with the
 * same shared functions: the grid is one stop for Tab, the arrows move between its controls, Home and End to
 * a row's ends
 *
 * @param props - the `rows` for the view, its `mode`, the `source` locales, the `expansion`; `onToggle`,
 * `onEdit` and `onRename` — a section's — which keep their identity, so a toggle or an edit redraws only the
 * rows it changes
 *
 * @returns the grid
 */
export const Grid = ({
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
	rows: TableRow[]
	mode: ViewMode
	source: RowSource
	expansion: Expansion
	onToggle: (id: string) => void
	sort: KeySort | undefined
	onSort: (column: KeySort['column']) => void
	onEdit: (edit: KeyEdit) => Promise<unknown>
	selection: Selection
	onSelect: (row: TableRow) => void
	onSelectAll: () => void
	onRename: (namespace: NamespaceName) => void
}) => {
	const expanded = useMemo(() => toExpandedState(expansion, rows, mode), [expansion, rows, mode])
	const tableRef = useRef<HTMLTableElement>(null)
	useLayoutEffect(() => {
		if (tableRef.current !== null) keepTableStop(tableRef.current)
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
			<span id={editHintIds.open} hidden>
				{studioText.editHint}
			</span>
			<span id={editHintIds.keys} hidden>
				{studioText.editKeys}
			</span>
			<span id={sortHintId} hidden>
				{studioText.sortHint}
			</span>
			<table
				ref={tableRef}
				id={tableId}
				aria-label={studioText.translations}
				className="w-full border-collapse text-start"
				onFocus={event => rove(event.currentTarget, event.target)}
				onKeyDown={event => {
					const to = controlAfter(event.currentTarget, event.target, event.key)
					if (to === undefined) return
					event.preventDefault()
					to.focus()
				}}
			>
				<thead className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_var(--color-border)]">
					<tr>
						<th scope="col" data-select className="w-0 px-2">
							<Tick
								label={studioText.selectShown}
								state={shownState(selection, rows)}
								onChange={onSelectAll}
								roving={false}
							/>
						</th>
						<SortableHead column={{ by: sortColumns.key }} sort={sort} onSort={onSort}>
							{studioText.key}
						</SortableHead>
						{descriptions && (
							<th scope="col" className={headClass}>
								{studioText.description}
							</th>
						)}
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
					</tr>
				</thead>
				<tbody>
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
									descriptions={descriptions}
									open={compact && isExpanded(expansion, id)}
									compact={compact}
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
				</tbody>
			</table>
		</>
	)
}

/**
 * a column's head that orders the grid by it when pressed — on screen only, the files untouched; its arrow
 * says which way, `aria-sort` on the sorted head only
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
	return (
		<th scope="col" aria-sort={direction} className={headClass}>
			<button
				type="button"
				aria-describedby={sortHintId}
				onClick={() => onSort(column)}
				className="inline-flex items-center gap-1 text-start font-semibold"
			>
				<span>{children}</span>
				<span aria-hidden="true" className={direction === undefined ? 'text-muted-foreground' : undefined}>
					{direction === undefined ? '↕' : direction === sortDirections.ascending ? '↑' : '↓'}
				</span>
			</button>
		</th>
	)
}

/**
 * the id of the words every sortable head points to: what sorting does, and does not
 */
const sortHintId = 'sort-hint'

/**
 * a section or a group: its name and how many keys it holds, opening and closing what is under it
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
		row: Exclude<TableRow, KeyTableRow>
		depth: number
		columns: number
		open: boolean
		onToggle: (id: string) => void
		state: SelectionState
		onSelect: (row: TableRow) => void
		onRename: (namespace: NamespaceName) => void
	}) => {
		const heading = (
			<>
				<span className={`${tableTextClasses.key} ${row.kind === rowKinds.section ? 'font-semibold' : ''}`}>
					{row.kind === rowKinds.section ? row.namespace : row.label}
				</span>{' '}
				<span className="shrink-0 text-muted-foreground">{countKeys(row.keys)}</span>
			</>
		)
		return (
			<tr data-row={row.id} data-state={state === selectionStates.all ? selectedRow : undefined} className={lineClass}>
				<td data-select className="px-2">
					{row.keys > 0 && (
						<Tick
							label={fill(studioText.selectGroup, { name: row.kind === rowKinds.section ? row.namespace : row.path })}
							state={state}
							onChange={() => onSelect(row)}
						/>
					)}
				</td>
				<th scope="row" colSpan={columns} className={cellClass} style={{ paddingInlineStart: indent(depth) }}>
					{row.keys > 0 ? (
						<Disclosure open={open} onToggle={() => onToggle(row.id)}>
							{heading}
						</Disclosure>
					) : (
						// a namespace holding no key has nothing to open: its name, said as it is
						<span className="inline-flex gap-1 ps-4">{heading}</span>
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
							className="ms-2 align-middle text-muted-foreground"
						>
							<span aria-hidden="true">✎</span>
						</button>
					)}
				</th>
			</tr>
		)
	}
)

/**
 * one key: its path, its description, its text in each shown locale — in compact view, opened, the rest
 * beneath the default's text
 */
const KeyLine = memo(
	({
		row,
		depth,
		locales,
		shown,
		defaultLocale,
		descriptions,
		open,
		compact,
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
		open: boolean
		compact: boolean
		onToggle: (id: string) => void
		onEdit: (edit: KeyEdit) => Promise<unknown>
		selected: boolean
		onSelect: (row: TableRow) => void
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
			<tr data-row={row.id} data-state={selected ? selectedRow : undefined} className={`${lineClass} align-top`}>
				<td data-select className="px-2">
					<Tick
						label={fill(studioText.select, { key: row.key })}
						state={selected ? selectionStates.all : selectionStates.none}
						onChange={() => onSelect(row)}
					/>
				</td>
				<th
					scope="row"
					title={row.key}
					className={`${cellClass} font-mono font-normal`}
					style={{ paddingInlineStart: indent(depth) }}
				>
					{compact ? (
						<Disclosure open={open} onToggle={() => onToggle(row.id)}>
							{label}
						</Disclosure>
					) : (
						label
					)}
				</th>
				{descriptions && (
					<td data-description className={`${cellClass} text-muted-foreground`}>
						{description}
					</td>
				)}
				{shown.map(locale => (
					<td key={locale} data-locale={locale} className={cellClass}>
						{value(locale)}
						{open && (
							<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
								{row.description !== undefined && (
									<>
										<dt className="text-muted-foreground">{studioText.description}</dt>
										<dd data-description className="text-muted-foreground">
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
					</td>
				))}
			</tr>
		)
	}
)

/**
 * a text a person can change in place — the shared editor's behaviour, in the panel's look: a click or Enter
 * opens it, Enter saves, Shift+Enter starts a new line, Escape cancels, leaving saves a change; the text now
 * on disk said beneath when the files brought another while it was open
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
	const edit = useEditable(text, onCommit)
	if (edit.draft === undefined)
		return (
			<button
				ref={edit.control}
				type="button"
				tabIndex={edit.roving ? 0 : -1}
				data-edit
				data-cell
				aria-describedby={editHintIds.open}
				onClick={event => edit.open(event.currentTarget.tabIndex === 0)}
				className="block min-h-5 w-full text-start"
			>
				{children}
				<span className="sr-only">{`, ${label}`}</span>
			</button>
		)
	return (
		<>
			<textarea
				// biome-ignore lint/a11y/noAutofocus: opened by the person, the field takes the keyboard they opened it with
				autoFocus
				data-editor
				value={edit.draft}
				dir="auto"
				lang={lang}
				aria-label={label}
				aria-describedby={edit.changed ? `${editHintIds.keys} ${editHintIds.onDisk}` : editHintIds.keys}
				aria-invalid={edit.changed}
				aria-busy={edit.saving}
				readOnly={edit.saving}
				className={`field-sizing-content block w-full resize-none border border-focus bg-input px-1 text-input-foreground ${tableTextClasses.text}`}
				onFocus={event => event.currentTarget.select()}
				onChange={event => edit.type(event.target.value)}
				onKeyDown={edit.keyDown}
				onBlur={edit.leave}
			/>
			{edit.changed && (
				<span id={editHintIds.onDisk} role="status" className="mt-1 block text-muted-foreground" dir="auto">
					{fill(studioText.onDisk, { text })}
				</span>
			)}
		</>
	)
}

/**
 * the ids of the words an editable text and its field point to: how to open it, the keys in it, and the
 * text now on disk
 */
const editHintIds = { open: 'edit-hint', keys: 'edit-keys', onDisk: 'edit-on-disk' } as const

/**
 * a native checkbox — one per row, light as the studio's measurements at 20,000 keys asked: ticked, empty,
 * or a dash when part of a section or group is selected; reached by the arrows, as every control in a cell
 */
const Tick = ({
	label,
	state,
	onChange,
	roving = true
}: {
	label: string
	state: SelectionState
	onChange: () => void
	roving?: boolean
}) => (
	<input
		type="checkbox"
		{...(roving ? { tabIndex: -1, 'data-cell': true } : {})}
		aria-label={label}
		checked={state === selectionStates.all}
		ref={box => {
			if (box !== null) box.indeterminate = state === selectionStates.some
		}}
		onChange={onChange}
		className="align-middle accent-chosen-border"
	/>
)

/**
 * how a row says it is selected
 */
export const selectedRow = 'selected'

/**
 * a button that opens and closes a row, its chevron turning with it
 */
const Disclosure = ({
	open,
	onToggle,
	children
}: {
	open: boolean
	onToggle: () => void
	children: React.ReactNode
}) => (
	<button
		type="button"
		tabIndex={-1}
		data-cell
		data-disclosure
		aria-expanded={open}
		onClick={onToggle}
		className="inline-flex items-start gap-1 text-start"
	>
		<span
			aria-hidden="true"
			className="inline-block w-3 shrink-0 in-aria-expanded:rotate-90 motion-safe:transition-transform"
		>
			›
		</span>
		{children}
	</button>
)

/**
 * a key as its row shows it: the part under its section or group, the whole key said for a screen reader
 */
const KeyLabel = ({ row }: { row: KeyTableRow }) =>
	row.label === row.key ? (
		<span data-label className={tableTextClasses.key}>
			{row.label}
		</span>
	) : (
		<>
			<span className="sr-only">{row.key}</span>
			<span data-label aria-hidden="true" className={tableTextClasses.key}>
				{row.label}
			</span>
		</>
	)

/**
 * a key's text in one locale, and its mark when the text alone does not say enough — both by the shared rules
 */
const Value = ({ row, locale, defaultLocale }: { row: KeyTableRow; locale: Locale; defaultLocale: Locale }) => {
	const mark = cellMark(row, locale, defaultLocale)
	const text = cellText(row, locale, mark)
	return (
		<>
			{text !== undefined && <Text text={text} lang={locale} />}
			{mark !== undefined && <Mark mark={mark} />}
		</>
	)
}

/**
 * text from the files: bounded inside its cell, wrapping, and in its own direction
 */
const Text = ({ text, lang }: { text: string; lang?: Locale }) => (
	<span data-text dir="auto" lang={lang} className={tableTextClasses.text}>
		{text}
	</span>
)

/**
 * a mark, in the classes constants give the studio and the extension alike — an absent key's dash spoken as
 * words, and outlined in high contrast only where it marks a text to translate or an extra one
 */
const Mark = ({ mark }: { mark: TableMark }) =>
	mark === tableMarks.absent ? (
		<span className={tableMarkClasses[mark]} title={studioText.absent}>
			<span aria-hidden="true">{tableMarkLabels[mark]}</span>
			<span className="sr-only">{studioText.absent}</span>
		</span>
	) : (
		<span data-mark={mark} className={`px-1 text-[0.625rem] uppercase tracking-wide ${tableMarkClasses[mark]}`}>
			{tableMarkLabels[mark]}
		</span>
	)

/**
 * @param depth - how deep a row sits
 *
 * @returns its indent, deeper rows further in
 */
const indent = (depth: number) => `calc(var(--spacing) * ${2 + depth * 4})`

const headClass = 'px-2 py-1.5 text-start font-semibold'
const cellClass = 'px-2 py-1.5 text-start'
const lineClass = 'border-border border-b data-[state=selected]:bg-chosen/40'
