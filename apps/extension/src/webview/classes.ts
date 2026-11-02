/**
 * a quiet button, in the editor's secondary button colours — how most of the panel's buttons look; its border
 * is drawn only where the theme gives buttons one, as high contrast does
 */
export const buttonClass =
	'inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-control-border bg-control px-2.5 py-1 text-control-foreground hover:bg-control-hover aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-control'

/**
 * the one button a view leads with — Add key, a dialog's confirmation — in the editor's primary colours
 */
export const primaryButtonClass =
	'inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-control-border bg-primary px-2.5 py-1 text-primary-foreground hover:bg-primary-hover aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-primary'

/**
 * a field a person types in
 */
export const fieldClass =
	'rounded-sm border border-input-border bg-input px-2 py-1 text-input-foreground placeholder:text-muted-foreground'
