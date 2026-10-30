import { type FormEvent, useMemo, useRef, useState } from 'react'
import {
	compositionKeyCode,
	exampleKeyPath,
	keyConflictText,
	keyPathProblemText,
	newKeyNotes,
	studioDelays,
	studioText
} from '@linguify/constants'
import { checkNewKeyForm, type NewKey, type NewKeyNote, stopsAdd } from '@linguify/table'
import type { Catalogue, KeyPath, Locale } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { Input } from '@linguify/ui/components/input'
import { Label } from '@linguify/ui/components/label'
import { cn } from '@linguify/ui/lib/utils'
import { fieldWidthClass, focusRingClass, inputFocusClass, textWidthClass } from './classes'
import { fill } from './format'
import { useSettled } from './settled'

/**
 * the id of the form that adds a key, which the button opening it controls
 */
export const addKeyFormId = 'add-key'

/**
 * the form that adds a key: its path, its description, and its text in every locale, the default's
 * required
 *
 * @note what stands in the way is worked out by {@link checkNewKeyForm} as the key is typed — the rules core
 * will apply — and shown under the path before anything is sent; Add does nothing while any of it stands,
 * and pressed then, takes the keyboard to the field at fault. The first thing in the way is also said
 * aloud, once typing pauses. A path's problem waits for the path to be typed, the default's text for its
 * field to be left or Add pressed
 *
 * @note while it saves, the form keeps still: its fields read-only, Escape and Close ignored. After adding,
 * it is cleared for the next key, and says what was added — and when the filter hides it
 *
 * @param props - `catalogue`, as last read; `locales`, the default first; `defaultLocale`; `descriptions`,
 * whether they are on; `rules`, the project's key rules and `keys.createNamespace`; `added`, the key last
 * added and whether the view hides it; `onAdd`, settled once the key is written; `onTyping`, the next key
 * begun; `onClearFilters`; `onClose`
 *
 * @returns the form
 */
export const AddKey = ({
	catalogue,
	locales,
	defaultLocale,
	descriptions,
	rules,
	added,
	onAdd,
	onTyping,
	onClearFilters,
	onClose
}: {
	catalogue: Catalogue
	locales: readonly Locale[]
	defaultLocale: Locale
	descriptions: boolean
	rules: { namespaced: boolean; nesting: boolean; createNamespace: boolean }
	added: { key: KeyPath; hidden: boolean } | undefined
	onAdd: (key: NewKey) => Promise<unknown>
	onTyping: () => void
	onClearFilters: () => void
	onClose: () => void
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
	const defaultMissing = shown.some(note => note.kind === newKeyNotes.defaultRequired)
	const pathBlocked = pathNotes.some(stopsAdd)
	const ready = check.ready && !saving
	const blocking = shown.find(stopsAdd)
	const spoken = useSettled(blocking === undefined ? '' : noteText(blocking), studioDelays.saying)
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (saving) return
		setTried(true)
		if (!check.ready) {
			const pathAtFault = check.notes.some(note => note.kind !== newKeyNotes.defaultRequired && stopsAdd(note))
			const field = pathAtFault ? keyInput : defaultInput
			field.current?.focus()
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
	const close = () => {
		if (!saving) onClose()
	}
	return (
		<form
			id={addKeyFormId}
			aria-label={studioText.addForm}
			aria-busy={saving}
			onSubmit={submit}
			onKeyDown={event => {
				const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === compositionKeyCode
				if (event.key === 'Escape' && !composing) close()
			}}
			className="flex shrink-0 flex-wrap items-start gap-3 border-b p-4"
		>
			<div className={cn('flex flex-col gap-1', textWidthClass)}>
				<Label htmlFor="new-key">{studioText.keyPath}</Label>
				<Input
					ref={keyInput}
					autoFocus
					id="new-key"
					dir="ltr"
					autoComplete="off"
					spellCheck={false}
					readOnly={saving}
					className={cn('font-mono', inputFocusClass)}
					placeholder={exampleKeyPath}
					aria-invalid={pathBlocked}
					aria-describedby={rules.namespaced ? `${addNoteIds.path} ${addNoteIds.hint}` : addNoteIds.path}
					value={path}
					onChange={event => {
						setPath(event.target.value)
						onTyping()
					}}
				/>
				{rules.namespaced && (
					<p id={addNoteIds.hint} className="text-muted-foreground text-xs">
						{fill(studioText.keyPathHint, { example: exampleKeyPath })}
					</p>
				)}
				<ul id={addNoteIds.path} className="flex flex-col gap-0.5 text-xs">
					{pathNotes.map(note => (
						<li key={noteText(note)} className={stopsAdd(note) ? 'text-destructive' : 'text-muted-foreground'}>
							{noteText(note)}
						</li>
					))}
				</ul>
			</div>
			{descriptions && (
				<div className="flex flex-col gap-1">
					<Label htmlFor="new-description">{studioText.description}</Label>
					<Input
						id="new-description"
						dir="auto"
						readOnly={saving}
						className={cn(fieldWidthClass, inputFocusClass)}
						value={description}
						onChange={event => setDescription(event.target.value)}
					/>
				</div>
			)}
			{locales.map(locale => {
				const isDefault = locale === defaultLocale
				return (
					<div key={locale} className="flex flex-col gap-1">
						<Label htmlFor={`new-text-${locale}`}>
							{locale}
							{isDefault && (
								<>
									{' '}
									<span className="font-normal text-muted-foreground">{studioText.defaultLocale}</span>
								</>
							)}
						</Label>
						<Input
							ref={isDefault ? defaultInput : undefined}
							id={`new-text-${locale}`}
							dir="auto"
							lang={locale}
							readOnly={saving}
							className={cn(fieldWidthClass, inputFocusClass)}
							aria-required={isDefault}
							aria-invalid={isDefault && defaultMissing}
							aria-describedby={isDefault && defaultMissing ? addNoteIds.default : undefined}
							value={texts[locale] ?? ''}
							onChange={event => setTexts(current => ({ ...current, [locale]: event.target.value }))}
							onBlur={() => {
								if (isDefault) setDefaultLeft(true)
							}}
						/>
						{isDefault && defaultMissing && (
							<p id={addNoteIds.default} className="text-destructive text-xs">
								{studioText.defaultRequired}
							</p>
						)}
					</div>
				)
			})}
			<div className="flex flex-col gap-1">
				<div className="mt-5 flex items-center gap-2">
					<Button
						type="submit"
						size="sm"
						className={cn('aria-disabled:opacity-50', focusRingClass)}
						aria-disabled={!ready}
					>
						{studioText.add}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={focusRingClass}
						aria-disabled={saving}
						onClick={close}
					>
						{studioText.close}
					</Button>
				</div>
				<p id="add-result" role="status" className="text-muted-foreground text-xs">
					{added !== undefined && fill(added.hidden ? studioText.addedHidden : studioText.added, { key: added.key })}
					{added?.hidden === true && (
						<Button
							type="button"
							variant="link"
							size="xs"
							className={cn('ms-1', focusRingClass)}
							onClick={() => {
								onClearFilters()
								keyInput.current?.focus()
							}}
						>
							{studioText.clearFilters}
						</Button>
					)}
				</p>
				<span role="status" className="sr-only">
					{spoken}
				</span>
			</div>
		</form>
	)
}

/**
 * @param note - one thing the form says
 *
 * @returns it in the studio's words
 */
const noteText = (note: NewKeyNote): string => {
	switch (note.kind) {
		case newKeyNotes.problem:
			return keyPathProblemText[note.problem]
		case newKeyNotes.duplicate:
			return fill(studioText.duplicate, { locales: note.locales.join(studioText.listSeparator) })
		case newKeyNotes.conflict:
			return fill(keyConflictText[note.conflict.state], { at: note.conflict.at, locale: note.conflict.locale })
		case newKeyNotes.newNamespace:
			return fill(note.allowed ? studioText.newNamespace : studioText.namespaceMissing, { namespace: note.namespace })
		case newKeyNotes.defaultRequired:
			return studioText.defaultRequired
	}
}

/**
 * the ids of what the form's fields point to
 */
const addNoteIds = {
	/**
	 * what stands in the path's way
	 */
	path: 'add-key-notes',

	/**
	 * how a path is written, with namespaces
	 */
	hint: 'add-key-hint',

	/**
	 * the note under the default's text
	 */
	default: 'add-key-default-note'
}
