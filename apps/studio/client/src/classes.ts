/**
 * a focus ring drawn in full on a primitive that brings its own, half-transparent one — too faint where
 * colour is the only cue on square corners
 */
export const focusRingClass = 'focus-visible:ring-ring'

/**
 * a focus ring for a plain button, which has none of its own: as strong as the primitives', set off from
 * the text
 */
export const plainFocusClass =
	'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'

/**
 * the classes of an item in the toolbar's switches, on top of the toggle's own
 *
 * @note the pressed item is filled, as the toggles' faint shade matches their hover — keyed on both
 * `aria-checked` and `data-state`, since a tooltip trigger sets its own `data-state` over the toggle's
 */
export const switchItemClass = `${focusRingClass} aria-checked:bg-primary aria-checked:text-primary-foreground aria-checked:hover:bg-primary/90 aria-checked:hover:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90`

/**
 * a plain button laid out as the table's: its icon beside its words, which start where text starts
 */
export const plainButtonClass = `inline-flex gap-1 text-start ${plainFocusClass}`

/**
 * an item of a menu the keyboard is on, filled like a pressed switch — the menus' own shade is too faint
 * to follow
 */
export const menuItemClass = 'focus:bg-primary focus:text-primary-foreground focus:**:text-primary-foreground'

/**
 * a field's group whose field the keyboard is in: ringed as strongly as every other control
 */
export const fieldFocusClass =
	'has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring'
