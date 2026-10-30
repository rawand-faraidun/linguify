import { memo, type ReactNode, useMemo } from 'react'
import {
	rowKinds,
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
	type KeySort,
	type KeyTableRow,
	localeOrder,
	type TableRow as Row,
	type RowSource,
	rowFeatures,
	rowOptionsFor,
	sameColumn,
	toExpandedState
} from '@linguify/table'
import type { Locale, TableMark, ViewMode } from '@linguify/types'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@linguify/ui/components/table'
import { cn } from '@linguify/ui/lib/utils'
import { tableFeatures, useTable } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronRightIcon } from 'lucide-react'
import { plainButtonClass } from './classes'
import { countKeys } from './format'

/**
 * the translation table, read-only: a section per namespace, groups in the tree view, a row per key
 *
 * @note a plain `<table>`, not the UI package's `Table`, which wraps it in a box that scrolls sideways —
 * that box would hold the sticky column heads instead of the page's scrolling middle. Each text is
 * bounded on a block inside its cell, as `max-width` on a `<td>` is only a hint, and reads in its own
 * direction, so Kurdish Sorani runs right to left inside the left-to-right table
 *
 * @param props - `rows`, built for `mode`; `source`, the project's locales and whether descriptions are
 * on; `expansion`, which rows are open; `onToggle`, to open or close one by id, which should not change
 * between renders — every row that did not change is then left as it is; `sort`, how the rows are ordered,
 * and `onSort`, a column's header pressed
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
	onSort
}: {
	rows: Row[]
	mode: ViewMode
	source: RowSource
	expansion: Expansion
	onToggle: (id: string) => void
	sort: KeySort | undefined
	onSort: (column: KeySort['column']) => void
}) {
	const expanded = useMemo(() => toExpandedState(expansion, rows, mode), [expansion, rows, mode])
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
			<table id="translations" aria-label={studioText.translations} className="w-full caption-bottom text-xs">
				<TableHeader className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_var(--color-border)]">
					<TableRow>
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
								/>
							) : (
								<GroupLine
									key={id}
									row={original}
									depth={depth}
									columns={columns}
									open={canExpand(mode, original) && isExpanded(expansion, id)}
									onToggle={onToggle}
								/>
							)
						)}
				</TableBody>
			</table>
		</>
	)
})

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
 * a button that opens and closes a row, its chevron turning with it
 */
const Disclosure = ({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: ReactNode }) => (
	<button type="button" aria-expanded={open} onClick={onToggle} className={cn('items-start', plainButtonClass)}>
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
		onToggle
	}: {
		row: Exclude<Row, KeyTableRow>
		depth: number
		columns: number
		open: boolean
		onToggle: (id: string) => void
	}) => (
		<TableRow data-row={row.id}>
			<TableHead
				scope="rowgroup"
				colSpan={columns}
				className="h-auto py-2 font-normal"
				style={{ paddingInlineStart: indent(depth) }}
			>
				<Disclosure open={open} onToggle={() => onToggle(row.id)}>
					<span className={cn(row.kind === rowKinds.section && 'font-semibold')}>
						{row.kind === rowKinds.section ? row.namespace : row.label}
					</span>
					<span className="text-muted-foreground">{countKeys(row.keys)}</span>
				</Disclosure>
			</TableHead>
		</TableRow>
	)
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
		onToggle
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
	}) => {
		const label = <KeyLabel row={row} />
		return (
			<TableRow data-row={row.id}>
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
					<TableCell className="align-top text-muted-foreground">
						<Text text={row.description} />
					</TableCell>
				)}
				{shown.map(locale => (
					<TableCell key={locale} className="align-top" data-locale={locale}>
						<Value row={row} locale={locale} defaultLocale={defaultLocale} />
						{open && (
							<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
								{descriptions && (
									<>
										<dt className="text-muted-foreground">{studioText.description}</dt>
										<dd className="text-muted-foreground">
											<Text text={row.description} />
										</dd>
									</>
								)}
								{locales.slice(1).map(other => (
									<div key={other} className="contents" data-locale={other}>
										<dt className="text-muted-foreground">{other}</dt>
										<dd>
											<Value row={row} locale={other} defaultLocale={defaultLocale} />
										</dd>
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
const keyLabelClass = 'wrap-anywhere block max-w-80 whitespace-normal'

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
		<div data-text dir="auto" lang={lang} className="max-w-80 whitespace-pre-wrap break-words">
			{text}
		</div>
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
