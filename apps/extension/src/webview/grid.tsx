import { memo, useMemo } from 'react'
import {
	rowKinds,
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
	countKeys,
	type Expansion,
	isExpanded,
	type KeyTableRow,
	rowFeatures,
	rowOptionsFor,
	type TableRow,
	toExpandedState
} from '@linguify/table'
import type { Locale, TableMark, ViewMode } from '@linguify/types'
import { tableFeatures, useTable } from '@tanstack/react-table'

/**
 * the translation grid: the rows `@linguify/table` builds for the view — sections, groups, keys — with the
 * default locale first and each text marked as the studio marks it, in the editor's own colours
 *
 * @note few nodes a row, as the studio's measurements at 20,000 keys taught: plain cells, no component per
 * text. Its head sticks to the top of the box it scrolls in. Editing and the keyboard's moves come with 13.5
 *
 * @param props - the `rows` for the view, its `mode`, the `source` locales, the `expansion` and `onToggle`,
 * which keeps its identity, so a toggle redraws only the rows it changes
 *
 * @returns the grid
 */
export const Grid = ({
	rows,
	mode,
	source,
	expansion,
	onToggle
}: {
	rows: TableRow[]
	mode: ViewMode
	source: RowSource
	expansion: Expansion
	onToggle: (id: string) => void
}) => {
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
		<table id={tableId} aria-label={studioText.translations} className="w-full border-collapse text-start">
			<thead className="sticky top-0 z-10 bg-background [&_th]:shadow-[inset_0_-1px_0_var(--color-border)]">
				<tr>
					<th scope="col" className={headClass}>
						{studioText.key}
					</th>
					{descriptions && (
						<th scope="col" className={headClass}>
							{studioText.description}
						</th>
					)}
					{shown.map(locale => (
						<th key={locale} scope="col" className={headClass}>
							{locale}
							{locale === source.default && (
								<>
									{' '}
									<span className="font-normal text-muted-foreground">{studioText.defaultLocale}</span>
								</>
							)}
						</th>
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
			</tbody>
		</table>
	)
}

/**
 * a section or a group: its name and how many keys it holds, opening and closing what is under it
 */
const GroupLine = memo(
	({
		row,
		depth,
		columns,
		open,
		onToggle
	}: {
		row: Exclude<TableRow, KeyTableRow>
		depth: number
		columns: number
		open: boolean
		onToggle: (id: string) => void
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
			<tr data-row={row.id} className={lineClass}>
				<th scope="row" colSpan={columns} className={cellClass} style={{ paddingInlineStart: indent(depth) }}>
					{row.keys > 0 ? (
						<Disclosure open={open} onToggle={() => onToggle(row.id)}>
							{heading}
						</Disclosure>
					) : (
						// a namespace holding no key has nothing to open: its name, said as it is
						<span className="inline-flex gap-1 ps-4">{heading}</span>
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
		onToggle
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
	}) => {
		const label = <KeyLabel row={row} />
		return (
			<tr data-row={row.id} className={`${lineClass} align-top`}>
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
						{row.description !== undefined && <Text text={row.description} />}
					</td>
				)}
				{shown.map(locale => (
					<td key={locale} data-locale={locale} className={cellClass}>
						<Value row={row} locale={locale} defaultLocale={defaultLocale} />
						{open && (
							<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
								{row.description !== undefined && (
									<>
										<dt className="text-muted-foreground">{studioText.description}</dt>
										<dd data-description className="text-muted-foreground">
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
					</td>
				))}
			</tr>
		)
	}
)

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
const lineClass = 'border-border border-b'
