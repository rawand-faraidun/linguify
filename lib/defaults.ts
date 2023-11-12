import type { Config } from './types'

/**
 * configuration file name
 */
export const configFileName = 'linguify.config.json'

/**
 * linguify default values
 */
export const defaultConfig: Config = {
  localesPath: './public/locales',
  locales: ['en'],
  defaultLocale: 'en'
}

/**
 * linguify default port
 */
export const defaultPort = 5678
