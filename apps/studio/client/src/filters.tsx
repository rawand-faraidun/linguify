import { useRef } from 'react'
import { studioText } from '@linguify/constants'
import { isFiltered, type KeyFilter, type LocaleCounts, noFilter, toTranslate } from '@linguify/table'
import type { Locale, NamespaceName } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@linguify/ui/components/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@linguify/ui/components/input-group'
import { cn } from '@linguify/ui/lib/utils'
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react'
import { fieldFocusClass, focusRingClass, menuItemClass } from './classes'
import { countKeys, fill, keysWord, numbers } from './format'

/**
 * the search box's id
 */
export const searchId = 'search'

/**
 * the search, the namespace filter, the still-to-translate filter with each locale's counts, how many keys
 * match, and a way to clear it all
 *
 * @note the menus are not modal: a modal one stops pointer events on the whole page, which makes the
 * browser restyle every row of a large table as it opens and closes. The count and Clear filters are
 * always there — the toolbar keeps its shape as a search starts, the count is announced as it changes,
 * and clearing leaves the keyboard where it was
 *
 * @param props - `filter` and `onChange`; `namespaces`, every namespace, empty when the project has
 * none; `counts`, each non-default locale's counts, in config order; `shown` and `total`, how many keys
 * pass the filter of how many
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
	const search = useRef<HTMLInputElement>(null)
	const filtered = isFiltered(filter)
	const locales = Object.entries(counts)
	const chosenLocales = locales.map(([locale]) => locale).filter(locale => filter.untranslatedIn.includes(locale))
	return (
		<>
			<search aria-label={studioText.search}>
				<InputGroup className={cn('w-56', fieldFocusClass)}>
					<InputGroupAddon role="none">
						<SearchIcon />
					</InputGroupAddon>
					<InputGroupInput
						ref={search}
						id={searchId}
						type="search"
						dir="auto"
						aria-label={studioText.search}
						placeholder={studioText.search}
						className="[&::-webkit-search-cancel-button]:appearance-none"
						value={filter.search}
						onChange={event => onChange({ ...filter, search: event.target.value })}
						onKeyDown={event => {
							if (event.key === 'Escape' && filter.search !== '') {
								event.preventDefault()
								onChange({ ...filter, search: '' })
							}
						}}
					/>
					{filter.search !== '' && (
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label={studioText.clearSearch}
								onClick={() => {
									onChange({ ...filter, search: '' })
									search.current?.focus()
								}}
							>
								<XIcon />
							</InputGroupButton>
						</InputGroupAddon>
					)}
				</InputGroup>
			</search>
			{namespaces.length > 1 && (
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button id="namespace-filter" variant="outline" size="sm" className={focusRingClass}>
							{filter.namespaces === undefined
								? studioText.namespaces
								: fill(studioText.chosen, {
										label: studioText.namespaces,
										chosen: fill(studioText.chosenOf, {
											count: numbers.format(filter.namespaces.length),
											total: numbers.format(namespaces.length)
										})
									})}
							<ChevronDownIcon data-icon="inline-end" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-auto min-w-(--radix-dropdown-menu-trigger-width)">
						{namespaces.map(namespace => (
							<DropdownMenuCheckboxItem
								key={namespace}
								className={menuItemClass}
								checked={filter.namespaces?.includes(namespace) ?? false}
								onSelect={event => event.preventDefault()}
								onCheckedChange={checked => {
									const next = namespaces.filter(name =>
										name === namespace ? checked : (filter.namespaces?.includes(name) ?? false)
									)
									onChange({ ...filter, namespaces: next.length === 0 ? undefined : next })
								}}
							>
								{namespace}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			{locales.length > 0 && (
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button id="untranslated-filter" variant="outline" size="sm" className={focusRingClass}>
							{chosenLocales.length === 0
								? studioText.untranslated
								: fill(studioText.chosen, {
										label: studioText.untranslated,
										chosen:
											chosenLocales.length <= 2
												? chosenLocales.join(studioText.listSeparator)
												: fill(studioText.chosenOf, {
														count: numbers.format(chosenLocales.length),
														total: numbers.format(locales.length)
													})
									})}
							<ChevronDownIcon data-icon="inline-end" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-auto min-w-(--radix-dropdown-menu-trigger-width)">
						{locales.map(([locale, count]) => (
							<DropdownMenuCheckboxItem
								key={locale}
								data-locale={locale}
								className={menuItemClass}
								checked={filter.untranslatedIn.includes(locale)}
								onSelect={event => event.preventDefault()}
								onCheckedChange={checked => {
									const chosen = filter.untranslatedIn.filter(name => name !== locale)
									onChange({ ...filter, untranslatedIn: checked ? [...chosen, locale] : chosen })
								}}
							>
								<span className="me-4 font-medium">{locale}</span>
								<span className="ms-auto whitespace-nowrap text-muted-foreground tabular-nums">
									{fill(studioText.untranslatedCount, { count: numbers.format(toTranslate(count)) })}
									<span aria-hidden="true">{studioText.countSeparator}</span>
									<span className="sr-only">{studioText.listSeparator}</span>
									{fill(studioText.extraCount, { count: numbers.format(count.extra) })}
								</span>
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			<span id="match-count" role="status" className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
				{filtered
					? fill(studioText.matchCount, {
							shown: numbers.format(shown),
							total: numbers.format(total),
							keys: keysWord(total)
						})
					: countKeys(total)}
			</span>
			<Button
				variant="ghost"
				size="sm"
				className={focusRingClass}
				aria-disabled={!filtered}
				onClick={() => {
					if (filtered) onChange(noFilter)
				}}
			>
				<XIcon data-icon="inline-start" />
				{studioText.clearFilters}
			</Button>
		</>
	)
}
