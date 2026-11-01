import { compositionKeyCode, exampleKeyPath, studioText } from '@linguify/constants'
import { checkNewKeyForm, fill, type NewKey, noteText, stopsAdd } from '@linguify/table'
import { useNewKeyForm } from '@linguify/table/react'
import type { Catalogue, KeyPath, KeyRules, Locale } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { Input } from '@linguify/ui/components/input'
import { Label } from '@linguify/ui/components/label'
import { cn } from '@linguify/ui/lib/utils'
import { fieldWidthClass, focusRingClass, inputFocusClass, textWidthClass } from './classes'
import { ignoreComposingEnter } from './composition'

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
	rules: KeyRules & { createNamespace: boolean }
	added: { key: KeyPath; hidden: boolean } | undefined
	onAdd: (key: NewKey) => Promise<unknown>
	onTyping: () => void
	onClearFilters: () => void
	onClose: () => void
}) => {
	const form = useNewKeyForm({ catalogue, rules, defaultLocale, onAdd })
	const {
		path,
		description,
		texts,
		saving,
		pathNotes,
		pathBlocked,
		defaultMissing,
		ready,
		spoken,
		submit,
		keyInput,
		defaultInput
	} = form
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
				ignoreComposingEnter(event)
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
						form.setPath(event.target.value)
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
						onChange={event => form.setDescription(event.target.value)}
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
							onChange={event => form.setText(locale, event.target.value)}
							onBlur={() => {
								if (isDefault) form.leftDefault()
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
						{saving ? studioText.adding : studioText.add}
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
