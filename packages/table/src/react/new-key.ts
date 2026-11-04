import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { newKeyNotes, studioDelays } from '@linguify/constants'
import type { Catalogue, KeyRules, Locale } from '@linguify/types'
import type { NewKey } from '../edit'
import { checkNewKeyForm, noteText, stopsAdd } from '../preflight'

/**
 * a value once it has stopped changing for a while — so what is said aloud waits for typing to pause
 *
 * @param value - the value now
 * @param after - how long it must hold, in milliseconds
 *
 * @returns the value it last held that long
 */
export const useSettled = (value: string, after: number): string => {
	const [settled, setSettled] = useState(value)
	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), after)
		return () => clearTimeout(timer)
	}, [value, after])
	return settled
}

/**
 * the form that adds a key, as the studio and the extension both keep it — each draws it its own way
 *
 * @note what stands in the way is worked out by `checkNewKeyForm` as the key is typed — the rules core will
 * apply — before anything is sent; adding does nothing while any of it stands, and tried then, takes the
 * keyboard to the field at fault. The first thing in the way is said aloud once typing pauses. A path's
 * problem waits for the path to be typed, the default's text for its field to be left or Add pressed. While
 * it saves, the fields hold still; after adding it is cleared for the next key, the keyboard on the path
 *
 * @param form - the `catalogue` as last read, the project's `rules` and `keys.createNamespace`, the
 * `defaultLocale`, and `onAdd`, settled once the key is written
 *
 * @returns the fields and their setters, what to show under each, whether it can be added, what is said
 * aloud, `submit`, and the refs the path's and the default text's fields take
 */
export const useNewKeyForm = ({
	catalogue,
	rules,
	defaultLocale,
	onAdd
}: {
	catalogue: Catalogue
	rules: KeyRules & { createNamespace: boolean }
	defaultLocale: Locale
	onAdd: (key: NewKey) => Promise<unknown>
}) => {
	const [path, setPath] = useState('')
	const [description, setDescription] = useState('')
	const [texts, setTexts] = useState<Record<Locale, string>>({})
	const [saving, setSaving] = useState(false)
	const [tried, setTried] = useState(false)
	const [defaultLeft, setDefaultLeft] = useState(false)
	const keyInput = useRef<HTMLInputElement>(null)
	const defaultInput = useRef<HTMLInputElement>(null)
	const check = useMemo(
		() => checkNewKeyForm(catalogue, { path, description, texts }, { ...rules, defaultLocale }),
		[catalogue, path, description, texts, rules, defaultLocale]
	)
	const shown = check.notes.filter(note =>
		note.kind === newKeyNotes.defaultRequired ? tried || defaultLeft : path !== '' || tried
	)
	const pathNotes = shown.filter(note => note.kind !== newKeyNotes.defaultRequired)
	const blocking = shown.find(stopsAdd)
	const spoken = useSettled(blocking === undefined ? '' : noteText(blocking), studioDelays.saying)
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (saving) return
		setTried(true)
		if (!check.ready) {
			const pathAtFault = check.notes.some(note => note.kind !== newKeyNotes.defaultRequired && stopsAdd(note))
			;(pathAtFault ? keyInput : defaultInput).current?.focus()
			return
		}
		setSaving(true)
		try {
			await onAdd({ path, description, texts })
			setPath('')
			setDescription('')
			setTexts({})
			setTried(false)
			setDefaultLeft(false)
			keyInput.current?.focus()
		} catch {
			// reported once for every write; what was typed stays to try again
		} finally {
			setSaving(false)
		}
	}
	return {
		path,
		setPath,
		description,
		setDescription,
		texts,
		setText: (locale: Locale, text: string) => setTexts(current => ({ ...current, [locale]: text })),
		leftDefault: () => setDefaultLeft(true),
		saving,
		pathNotes,
		pathBlocked: pathNotes.some(stopsAdd),
		defaultMissing: shown.some(note => note.kind === newKeyNotes.defaultRequired),
		ready: check.ready && !saving,
		spoken,
		submit,
		keyInput,
		defaultInput
	}
}
