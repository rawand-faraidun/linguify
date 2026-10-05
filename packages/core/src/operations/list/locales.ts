import type { LocaleList } from '@linguify/types'
import type { OperationContext } from '../context'

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
