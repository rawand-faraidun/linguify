import type { Configs } from './types'

/**
 * configuration file name
 */
export const configFileName = 'linguify.config.json'

/**
 * linguify default values
 */
export const defaultConfigs: Configs = {
  localesPath: './public/locales',
  locales: ['en'],
  defaultLocale: 'en',
  useGoogleTranslate: true
}
