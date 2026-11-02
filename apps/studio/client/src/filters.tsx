import { useRef } from 'react'
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

/**
 * the search box's id
 */
export const searchId = 'search'

/**
 * the search, the namespace filter, and the still-to-translate filter with each locale's counts — how many
 * keys match is said in the header, and a filter is cleared where it was set
 *
 * @note the menus are not modal: a modal one stops pointer events on the whole page, which makes the
 * browser restyle every row of a large table as it opens and closes
 *
 * @param props - `filter` and `onChange`; `namespaces`, every namespace, empty when the project has
 * none; `counts`, each non-default locale's counts, in config order
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
	const search = useRef<HTMLInputElement>(null)
	const locales = Object.entries(counts)
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
							// Escape that ends a composition is the input method's, not a clear
							if (isComposing(event.nativeEvent)) return
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
							{namespaceFilterLabel(filter, namespaces)}
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
									onChange(toggleNamespace(filter, namespaces, namespace, checked))
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
							{untranslatedFilterLabel(
								filter,
								locales.map(([locale]) => locale)
							)}
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
									onChange(toggleUntranslated(filter, locale, checked))
								}}
							>
								<span className="me-4 font-medium">{locale}</span>
								<span className="ms-auto whitespace-nowrap text-muted-foreground tabular-nums">
									{localeCountsText(count).untranslated}
									<span aria-hidden="true">{studioText.countSeparator}</span>
									<span className="sr-only">{studioText.listSeparator}</span>
									{localeCountsText(count).extra}
								</span>
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</>
	)
}
