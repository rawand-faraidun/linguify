import { studioText, themeLabels, themes } from '@linguify/constants'
import type { Theme } from '@linguify/types'
import { ToggleGroup, ToggleGroupItem } from '@linguify/ui/components/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@linguify/ui/components/tooltip'
import { isTheme, useTheme } from '@linguify/ui/theme'
import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

/**
 * the icon shown for each theme
 */
const icons = {
	[themes.light]: SunIcon,
	[themes.dark]: MoonIcon,
	[themes.system]: MonitorIcon
} satisfies Record<Theme, LucideIcon>

/**
 * light, dark or the system's theme, one press each
 *
 * @note the toggles' own focus ring is half-transparent, too faint where colour is the only cue on square
 * corners — so the ring is drawn in full
 *
 * @note the tooltip's trigger sets its own `data-state` over the toggle's, so the pressed look is keyed on
 * `aria-checked` instead — and filled, as the toggles' faint shade matches their hover and barely shows
 *
 * @returns the switch
 */
export const ThemeSwitch = () => {
	const { theme, setTheme } = useTheme()
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			aria-label={studioText.theme}
			value={theme}
			onValueChange={value => {
				if (isTheme(value)) setTheme(value)
			}}
		>
			{Object.values(themes).map(name => {
				const Icon = icons[name]
				return (
					<Tooltip key={name}>
						<TooltipTrigger asChild>
							<ToggleGroupItem
								value={name}
								aria-label={themeLabels[name]}
								className="focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground aria-checked:hover:bg-primary/90 aria-checked:hover:text-primary-foreground"
							>
								<Icon />
							</ToggleGroupItem>
						</TooltipTrigger>
						<TooltipContent>{themeLabels[name]}</TooltipContent>
					</Tooltip>
				)
			})}
		</ToggleGroup>
	)
}
