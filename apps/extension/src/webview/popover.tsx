import { type ReactNode, useEffect, useRef } from 'react'
import { buttonClass } from './classes'

/**
 * a button that opens a small panel beneath it — native `details`, as a library's popover would bring its
 * own styles, which the panel's policy refuses
 *
 * @note it closes on a click anywhere else, on Escape — the keyboard back on its button — and once the
 * keyboard leaves it, so it never covers what Tab reaches next. Opened near the panel's edge, it moves back
 * by what would be cut off, never past the other edge
 *
 * @param props - `id`; `label`, its button's words; `children`, what it holds
 *
 * @returns the popover
 */
export const Popover = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => {
	const details = useRef<HTMLDetailsElement>(null)
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
				const panel = event.currentTarget.querySelector<HTMLElement>('[data-popover]')
				if (!event.currentTarget.open || panel === null) return
				panel.style.left = ''
				const { left, right } = panel.getBoundingClientRect()
				const over = right - document.documentElement.clientWidth
				if (over > 0) panel.style.left = `${-Math.min(over, left)}px`
			}}
			onBlur={event => {
				const next = event.relatedTarget
				if (event.currentTarget.open && !(next instanceof Node && event.currentTarget.contains(next)))
					event.currentTarget.open = false
			}}
			onKeyDown={event => {
				if (event.key !== 'Escape' || !event.currentTarget.open) return
				event.preventDefault()
				event.currentTarget.open = false
				event.currentTarget.querySelector('summary')?.focus()
			}}
		>
			<summary className={`${buttonClass} cursor-default list-none`}>
				{label}
				<span aria-hidden="true" className="text-[0.625rem] opacity-70">
					▾
				</span>
			</summary>
			<div
				data-popover
				className="absolute z-20 mt-1 w-max max-w-[calc(100vw-1rem)] rounded-md border border-widget-border bg-background p-2 shadow-[0_2px_8px_var(--color-widget-shadow)]"
			>
				{children}
			</div>
		</details>
	)
}

/**
 * @param element - something inside a popover
 *
 * @returns closes that popover, the keyboard back on its button
 */
export const closePopover = (element: Element) => {
	const details = element.closest('details')
	if (details === null) return
	details.open = false
	details.querySelector('summary')?.focus()
}
