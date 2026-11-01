import { compositionKeyCode, studioText } from '@linguify/constants'
import {
	countKeys,
	fill,
	isFiltered,
	type KeyFilter,
	keysWord,
	type LocaleCounts,
	noFilter,
	numbers,
	toTranslate
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
				className="min-w-40 border border-control-border bg-input px-1.5 py-0.5 text-input-foreground"
				value={filter.search}
				onChange={event => onChange({ ...filter, search: event.target.value })}
				onKeyDown={event => {
					// Escape that ends a composition is the input method's, not a clear
					if (event.nativeEvent.isComposing || event.keyCode === compositionKeyCode) return
					if (event.key === 'Escape' && filter.search !== '') {
						event.preventDefault()
						onChange({ ...filter, search: '' })
					}
				}}
			/>
			{namespaces.length > 1 && (
				<Choices
					id="namespace-filter"
					label={
						filter.namespaces === undefined
							? studioText.namespaces
							: fill(studioText.chosen, {
									label: studioText.namespaces,
									chosen: fill(studioText.chosenOf, {
										count: numbers.format(filter.namespaces.length),
										total: numbers.format(namespaces.length)
									})
								})
					}
					options={namespaces.map(namespace => ({
						value: namespace,
						label: namespace,
						checked: filter.namespaces?.includes(namespace) ?? false
					}))}
					onToggle={(namespace, checked) => {
						const next = namespaces.filter(name =>
							name === namespace ? checked : (filter.namespaces?.includes(name) ?? false)
						)
						onChange({ ...filter, namespaces: next.length === 0 ? undefined : next })
					}}
				/>
			)}
			{locales.length > 0 && (
				<Choices
					id="untranslated-filter"
					label={
						filter.untranslatedIn.length === 0
							? studioText.untranslated
							: fill(studioText.chosen, {
									label: studioText.untranslated,
									chosen: filter.untranslatedIn.join(studioText.listSeparator)
								})
					}
					options={locales.map(locale => {
						const count = counts[locale] ?? { missing: 0, empty: 0, extra: 0 }
						return {
							value: locale,
							label: `${locale} — ${fill(studioText.untranslatedCount, { count: numbers.format(toTranslate(count)) })}${studioText.countSeparator}${fill(studioText.extraCount, { count: numbers.format(count.extra) })}`,
							checked: filter.untranslatedIn.includes(locale)
						}
					})}
					onToggle={(locale, checked) => {
						const chosen = filter.untranslatedIn.filter(name => name !== locale)
						onChange({ ...filter, untranslatedIn: checked ? [...chosen, locale] : chosen })
					}}
				/>
			)}
			<span role="status" className="text-muted-foreground">
				{isFiltered(filter)
					? fill(studioText.matchCount, {
							shown: numbers.format(shown),
							total: numbers.format(total),
							keys: keysWord(total)
						})
					: countKeys(total)}
			</span>
			{isFiltered(filter) && (
				<button type="button" className={controlClass} onClick={() => onChange(noFilter)}>
					{studioText.clearFilters}
				</button>
			)}
		</>
	)
}

/**
 * a set of choices behind a button — native `details`, its checkboxes one stop each
 */
const Choices = ({
	id,
	label,
	options,
	onToggle
}: {
	id: string
	label: string
	options: { value: string; label: string; checked: boolean }[]
	onToggle: (value: string, checked: boolean) => void
}) => (
	<details id={id} className="relative">
		<summary className={`${controlClass} cursor-default list-none`}>{label}</summary>
		<fieldset className="absolute z-20 mt-1 flex min-w-max flex-col gap-1 border border-control-border bg-background p-2">
			<legend className="sr-only">{label}</legend>
			{options.map(option => (
				<label key={option.value} className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={option.checked}
						onChange={event => onToggle(option.value, event.target.checked)}
					/>
					<span dir="auto">{option.label}</span>
				</label>
			))}
		</fieldset>
	</details>
)

/**
 * the search box's id
 */
export const searchId = 'search'

const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
