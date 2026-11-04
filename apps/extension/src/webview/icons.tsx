/**
 * the panel's few icons, drawn inline in the text's colour — a font of icons would be one more file for the
 * page's policy to let in
 */

/**
 * a chevron pointing toward the end — a disclosure turns it down when open
 */
export const ChevronIcon = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 16 16"
		className="size-3.5 shrink-0"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<path d="m6 4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
)

/**
 * a pencil — what renames a key or a namespace
 */
export const PencilIcon = () => (
	<svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.25">
		<path d="M11 2.5a1.4 1.4 0 0 1 2 2L5.5 12 2.5 13l1-3z" strokeLinejoin="round" />
	</svg>
)
