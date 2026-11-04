import { Fragment } from 'react'
import { studioText } from '@linguify/constants'
import {
	isComposing,
	type KeyFilter,
	type LocaleCounts,
	localeCountsText,
	namespaceFilterLabel,
	toggleNamespace,
	toggleUntranslated,
	untranslatedFilterLabel
} from '@linguify/table'
import type { Locale, NamespaceName } from '@linguify/types'
import { fieldClass } from './classes'
import { Popover } from './popover'

/**
 * the search, the namespace filter and the missing filter with each locale's counts — the studio's controls,
 * in native elements: a library's menus would bring their own styles, which the panel's policy refuses. How
 * many keys match is said in the header; a filter is cleared where it was set
 *
 * @param props - `filter` and `onChange`; `namespaces`, every namespace, empty when the project has none;
 * `counts`, each non-default locale's counts, in config order
 *
 * @returns the controls
 */
export const Filters = ({
	filter,
	onChange,
	namespaces,
	counts
}: {
	filter: KeyFilter
	onChange: (filter: KeyFilter) => void
	namespaces: readonly NamespaceName[]
	counts: Readonly<Record<Locale, LocaleCounts>>
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
				className={`w-64 max-w-full ${fieldClass}`}
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
}) => (
	<Popover id={id} label={label}>
		<fieldset className="flex flex-col gap-1.5">
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
	</Popover>
)

/**
 * the search box's id
 */
export const searchId = 'search'
