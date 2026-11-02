import { Fragment, useEffect, useRef } from 'react'
import { studioText } from '@linguify/constants'
import {
	isComposing,
	isFiltered,
	type KeyFilter,
	type LocaleCounts,
	localeCountsText,
	matchCountText,
	namespaceFilterLabel,
	noFilter,
	toggleNamespace,
	toggleUntranslated,
	untranslatedFilterLabel
} from '@linguify/table'
import type { Locale, NamespaceName } from '@linguify/types'

/**
 * the search, the namespace filter, the missing filter with each locale's counts, how many keys match, and a
 * way to clear it all — the studio's controls, in native elements: a library's menus would bring their own
 * styles, which the panel's policy refuses
 *
 * @param props - `filter` and `onChange`; `namespaces`, every namespace, empty when the project has none;
 * `counts`, each non-default locale's counts, in config order; `shown` and `total`, how many keys pass the
 * filter of how many
 *
 * @returns the controls
 */
export const Filters = ({
	filter,
	onChange,
	namespaces,
	counts,
	shown,
	total
}: {
	filter: KeyFilter
	onChange: (filter: KeyFilter) => void
	namespaces: readonly NamespaceName[]
	counts: Readonly<Record<Locale, LocaleCounts>>
	shown: number
	total: number
}) => {
	const locales = Object.keys(counts)
	return (
		<>
			<input
				id={searchId}
				type="search"
				dir="auto"
				aria-label={studioText.search}
				placeholder={studioText.search}
				className="min-w-40 border border-input-border bg-input px-1.5 py-0.5 text-input-foreground"
				value={filter.search}
				onChange={event => onChange({ ...filter, search: event.target.value })}
				onKeyDown={event => {
					// Escape that ends a composition is the input method's, not a clear
					if (isComposing(event.nativeEvent)) return
					if (event.key === 'Escape' && filter.search !== '') {
						event.preventDefault()
						onChange({ ...filter, search: '' })
					}
				}}
			/>
			{namespaces.length > 1 && (
				<Choices
					id="namespace-filter"
					label={namespaceFilterLabel(filter, namespaces)}
					options={namespaces.map(namespace => ({
						value: namespace,
						label: namespace,
						checked: filter.namespaces?.includes(namespace) ?? false
					}))}
					onToggle={(namespace, checked) => {
						onChange(toggleNamespace(filter, namespaces, namespace, checked))
					}}
				/>
			)}
			{locales.length > 0 && (
				<Choices
					id="untranslated-filter"
					label={untranslatedFilterLabel(filter, locales)}
					options={locales.map(locale => {
						const said = localeCountsText(counts[locale] ?? { missing: 0, empty: 0, extra: 0 })
						return {
							value: locale,
							label: locale,
							detail: [said.untranslated, said.extra],
							checked: filter.untranslatedIn.includes(locale)
						}
					})}
					onToggle={(locale, checked) => {
						onChange(toggleUntranslated(filter, locale, checked))
					}}
				/>
			)}
			<span id="match-count" role="status" className="text-muted-foreground">
				{matchCountText(filter, shown, total)}
			</span>
			{/* always there, as the studio's: clearing leaves the keyboard where it was */}
			<button
				type="button"
				aria-disabled={!isFiltered(filter)}
				className={`${controlClass} aria-disabled:opacity-50`}
				onClick={() => {
					if (isFiltered(filter)) onChange(noFilter)
				}}
			>
				{studioText.clearFilters}
			</button>
		</>
	)
}

/**
 * a set of choices behind a button — native `details`, its checkboxes one stop each, each with what it
 * counts beside it, the visible separator unsaid
 */
const Choices = ({
	id,
	label,
	options,
	onToggle
}: {
	id: string
	label: string
	options: { value: string; label: string; detail?: readonly string[]; checked: boolean }[]
	onToggle: (value: string, checked: boolean) => void
}) => {
	const details = useRef<HTMLDetailsElement>(null)
	// closed by a click anywhere else, as a menu is
	useEffect(() => {
		const away = (event: PointerEvent) => {
			const open = details.current
			if (open?.open && event.target instanceof Node && !open.contains(event.target)) open.open = false
		}
		document.addEventListener('pointerdown', away)
		return () => document.removeEventListener('pointerdown', away)
	}, [])
	return (
		<details
			ref={details}
			id={id}
			className="relative"
			onToggle={event => {
				// opened near the panel's edge, it moves back by what would be cut off — never past the other edge
				const menu = event.currentTarget.querySelector('fieldset')
				if (!event.currentTarget.open || menu === null) return
				menu.style.left = ''
				const { left, right } = menu.getBoundingClientRect()
				const over = right - document.documentElement.clientWidth
				if (over > 0) menu.style.left = `${-Math.min(over, left)}px`
			}}
			onBlur={event => {
				// closed once the keyboard leaves it, so it never covers the column heads Tab reaches next
				const next = event.relatedTarget
				if (event.currentTarget.open && !(next instanceof Node && event.currentTarget.contains(next)))
					event.currentTarget.open = false
			}}
			onKeyDown={event => {
				// Escape closes it, the keyboard back on its button
				if (event.key !== 'Escape' || !event.currentTarget.open) return
				event.preventDefault()
				event.currentTarget.open = false
				event.currentTarget.querySelector('summary')?.focus()
			}}
		>
			<summary className={`${controlClass} cursor-default list-none`}>{label}</summary>
			<fieldset className="absolute z-20 mt-1 flex w-max max-w-[calc(100vw-1rem)] flex-col gap-1 border border-widget-border bg-background p-2 shadow-[0_2px_8px_var(--color-widget-shadow)]">
				<legend className="sr-only">{label}</legend>
				{options.map(option => (
					<label key={option.value} className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={option.checked}
							onChange={event => onToggle(option.value, event.target.checked)}
						/>
						<span dir="auto">{option.label}</span>
						{option.detail !== undefined && (
							<span className="ms-auto ps-3 text-muted-foreground tabular-nums">
								{' '}
								{option.detail.map((part, index) => (
									<Fragment key={part}>
										{index > 0 && (
											<>
												<span aria-hidden="true">{studioText.countSeparator}</span>
												<span className="sr-only">{studioText.listSeparator}</span>
											</>
										)}
										{part}
									</Fragment>
								))}
							</span>
						)}
					</label>
				))}
			</fieldset>
		</details>
	)
}

/**
 * the search box's id
 */
export const searchId = 'search'

const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
