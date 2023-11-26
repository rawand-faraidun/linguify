import type { Config } from './types'

/**
 * configuration file name
 */
export const configFileName = 'linguify.config.json'

/**
 * config schema path
 */
export const configSchemaPath = 'https://github.com/rawand-faraidun/linguify/blob/main/assets/schema.json'

/**
 * linguify default values
 */
export const defaultConfig = {
  $schema: configSchemaPath,
  localesPath: './public/locales',
  locales: ['en'],
  defaultLocale: 'en'
}

/**
 * linguify default port
 */
export const defaultPort = 5678
