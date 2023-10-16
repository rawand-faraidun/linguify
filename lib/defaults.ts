import type { Configs } from './types'

/**
 * configuration file name
 */
export const configFileName = 'linguify.config.json'

/**
 * linguify default values
 */
export const defaultConfig: Configs = {
  localesPath: './public/locales',
  locales: ['en'],
  defaultLocale: 'en',
  useGoogleTranslate: false
}

/**
 * linguify default port
 */
export const defaultPort = 5678
