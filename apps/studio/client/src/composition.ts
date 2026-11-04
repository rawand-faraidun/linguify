import type { KeyboardEvent } from 'react'
import { isComposing } from '@linguify/table'

/**
 * keeps Enter that ends an input method's composition from sending a form — Safari sends it otherwise, with
 * a word half typed
 *
 * @param event - a key pressed in the form
 */
export const ignoreComposingEnter = (event: KeyboardEvent<HTMLFormElement>) => {
	if (event.key === 'Enter' && isComposing(event.nativeEvent)) event.preventDefault()
}
