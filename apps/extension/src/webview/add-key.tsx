import { exampleKeyPath, studioText } from '@linguify/constants'
import { addedText, fill, isComposing, type NewKey, noteText, stopsAdd } from '@linguify/table'
import { useNewKeyForm } from '@linguify/table/react'
import type { Catalogue, KeyPath, KeyRules, Locale } from '@linguify/types'

/**
 * the form that adds a key — the studio's, in the panel's look: its path, its description, its text in every
 * locale, the default's required, and what stands in the way said under the path before anything is sent
 *
 * @note its behaviour is `useNewKeyForm`'s, the studio's too: Add does nothing while anything stands, and
 * pressed then, takes the keyboard to the field at fault; the first thing in the way is said aloud once
 * typing pauses; while it saves, the form keeps still; after adding, it is cleared for the next key and says
 * what was added — and when the filter hides it. Escape closes it, an input method's composition aside
 *
 * @param props - `catalogue`, as last read; `locales`, the default first; `defaultLocale`; `descriptions`,
 * whether they are on; `rules`; `added`, the key last added and whether the view hides it; `onAdd`, settled
 * once written; `onTyping`, the next key begun; `onClearFilters`; `onClose`
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
	return (
		<form
			id="add-key"
			aria-label={studioText.addForm}
			aria-busy={form.saving}
			onSubmit={form.submit}
			onKeyDown={event => {
				const composing = isComposing(event.nativeEvent)
				if (composing) {
					if (event.key === 'Enter') event.preventDefault()
					return
				}
				if (event.key === 'Escape' && !form.saving) onClose()
			}}
			className="flex max-h-[50dvh] shrink-0 flex-wrap items-start gap-3 overflow-auto border-border border-b px-2 py-2"
		>
			<div className="flex max-w-80 flex-col gap-1">
				<label htmlFor="new-key">{studioText.keyPath}</label>
				<input
					ref={form.keyInput}
					// biome-ignore lint/a11y/noAutofocus: opened by the person to type a key
					autoFocus
					id="new-key"
					dir="ltr"
					autoComplete="off"
					spellCheck={false}
					readOnly={form.saving}
					placeholder={exampleKeyPath}
					aria-invalid={form.pathBlocked}
					aria-describedby={rules.namespaced ? 'add-key-notes add-key-hint' : 'add-key-notes'}
					className={`font-mono ${fieldClass}`}
					value={form.path}
					onChange={event => {
						form.setPath(event.target.value)
						onTyping()
					}}
				/>
				{rules.namespaced && (
					<p id="add-key-hint" className="text-muted-foreground">
						{fill(studioText.keyPathHint, { example: exampleKeyPath })}
					</p>
				)}
				<ul id="add-key-notes" className="flex flex-col gap-0.5">
					{form.pathNotes.map(note => (
						<li
							key={noteText(note)}
							className={stopsAdd(note) ? 'font-semibold text-foreground' : 'text-muted-foreground'}
						>
							{noteText(note)}
						</li>
					))}
				</ul>
			</div>
			{descriptions && (
				<div className="flex flex-col gap-1">
					<label htmlFor="new-description">{studioText.description}</label>
					<input
						id="new-description"
						dir="auto"
						readOnly={form.saving}
						className={fieldClass}
						value={form.description}
						onChange={event => form.setDescription(event.target.value)}
					/>
				</div>
			)}
			{locales.map(locale => {
				const isDefault = locale === defaultLocale
				return (
					<div key={locale} className="flex flex-col gap-1">
						<label htmlFor={`new-text-${locale}`}>
							{locale}
							{isDefault && (
								<>
									{' '}
									<span className="text-muted-foreground">{studioText.defaultLocale}</span>
								</>
							)}
						</label>
						<input
							ref={isDefault ? form.defaultInput : undefined}
							id={`new-text-${locale}`}
							dir="auto"
							lang={locale}
							readOnly={form.saving}
							aria-required={isDefault}
							aria-invalid={isDefault && form.defaultMissing}
							aria-describedby={isDefault && form.defaultMissing ? 'add-key-default' : undefined}
							className={fieldClass}
							value={form.texts[locale] ?? ''}
							onChange={event => form.setText(locale, event.target.value)}
							onBlur={() => {
								if (isDefault) form.leftDefault()
							}}
						/>
						{isDefault && form.defaultMissing && (
							<p id="add-key-default" className="font-semibold">
								{studioText.defaultRequired}
							</p>
						)}
					</div>
				)
			})}
			<div className="flex flex-col gap-1">
				<div className="mt-5 flex items-center gap-2">
					<button type="submit" aria-disabled={!form.ready} className={`${controlClass} aria-disabled:opacity-50`}>
						{form.saving ? studioText.adding : studioText.add}
					</button>
					<button
						type="button"
						aria-disabled={form.saving}
						className={controlClass}
						onClick={() => {
							if (!form.saving) onClose()
						}}
					>
						{studioText.close}
					</button>
				</div>
				<p id="add-result" role="status" className="text-muted-foreground">
					{addedText(added)}
					{added?.hidden === true && (
						<button
							type="button"
							className="ms-1 underline"
							onClick={() => {
								onClearFilters()
								form.keyInput.current?.focus()
							}}
						>
							{studioText.clearFilters}
						</button>
					)}
				</p>
				<span role="status" className="sr-only">
					{form.spoken}
				</span>
			</div>
		</form>
	)
}

const fieldClass = 'border border-input-border bg-input px-1.5 py-0.5 text-input-foreground'
const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
