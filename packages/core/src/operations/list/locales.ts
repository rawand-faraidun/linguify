import type { Locale } from '@linguify/types'
import type { OperationContext } from '../context'

/**
 * `list locales`' result
 */
export type LocaleList = {
	/**
	 * the default locale, the one every other is compared against
	 */
	default: Locale

	/**
	 * every configured locale, in config order
	 */
	locales: Locale[]
}

/**
 * lists the configured locales
 *
 * @param context - the operation context
 *
 * @returns every locale in config order, and which one is the default
 */
export const listLocales = ({ config }: OperationContext): LocaleList => ({
	default: config.default,
	locales: [...config.locales]
})
