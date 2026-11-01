import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { compositionKeyCode } from '@linguify/constants'
import { editedText } from '../edit'

/**
 * a text a person can change in place — what the studio and the extension both draw their own way: shown
 * as a control, a click or Enter opens it, Enter saves, Shift+Enter starts a new line, Escape cancels, and
 * leaving it saves a change
 *
 * @note it remembers the text it opened on. Should the files bring another while it is open — a refresh
 * after a stale write — `changed` says so, and only Enter saves over it: leaving does not. What was typed
 * stays while the write is under way and when it fails, and one write is never sent twice — not by a second
 * Enter, nor by leaving after a failure with nothing changed since. An input method's composition keeps its
 * Enter and Escape
 *
 * @param text - the text as the files hold it
 * @param onCommit - writes a changed text, settled once written
 *
 * @returns `draft` — what the field holds, or `undefined` while it is closed — `saving`, `changed`, `roving`
 * (whether the control was the table's stop for Tab when opened), `open`, `type`, `keyDown`, `leave`, and
 * `control`, the ref the closed control takes, which gets the keyboard back after Enter or Escape
 */
export const useEditable = (text: string, onCommit: (text: string) => Promise<unknown>) => {
	const [draft, setDraft] = useState<string>()
	const [base, setBase] = useState(text)
	const [saving, setSaving] = useState(false)
	const [roving, setRoving] = useState(false)
	const editing = useRef(false)
	const pending = useRef(false)
	const failed = useRef<string | undefined>(undefined)
	const control: RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement>(null)
	// the keyboard goes back to the control once it is drawn again — not on a timer, which a busy page outruns
	const giveBack = useRef(false)
	useEffect(() => {
		if (draft !== undefined || !giveBack.current) return
		giveBack.current = false
		control.current?.focus()
	}, [draft])
	const changed = draft !== undefined && text !== base
	if (draft !== undefined && changed && draft === base) {
		// nothing typed yet: the text from the files is simply the new start
		setBase(text)
		setDraft(text)
	}
	const close = (back: boolean) => {
		editing.current = false
		failed.current = undefined
		giveBack.current = back
		setDraft(undefined)
	}
	const commit = async (typed: string, how: 'enter' | 'leave') => {
		if (!editing.current || pending.current) return
		if (how === 'leave' && (changed || typed === failed.current)) return
		// the field gives line breaks back as line feeds: unchanged text writes nothing, and \r\n stays
		const written = editedText(typed, text)
		if (written === undefined) return close(how === 'enter')
		pending.current = true
		setSaving(true)
		try {
			await onCommit(written)
			close(how === 'enter')
		} catch {
			// reported once for every write; what was typed stays to try again
			failed.current = typed
			setBase(text)
		} finally {
			pending.current = false
			setSaving(false)
		}
	}
	return {
		draft,
		saving,
		changed,
		roving,
		control,
		/**
		 * opens the field on the text
		 *
		 * @param stop - whether the control opened was the table's stop for Tab
		 */
		open: (stop: boolean) => {
			setRoving(stop)
			editing.current = true
			setBase(text)
			setDraft(text)
		},
		type: setDraft,
		keyDown: (event: KeyboardEvent<HTMLElement>) => {
			const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === compositionKeyCode
			if (composing || draft === undefined) return
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()
				setBase(text)
				void commit(draft, 'enter')
			} else if (event.key === 'Escape' && !saving) {
				event.preventDefault()
				close(true)
			}
		},
		leave: () => {
			if (draft !== undefined) void commit(draft, 'leave')
		}
	}
}
