import type { Config } from './types'

/**
 * default config props
 */
type DefaultConfig = Config & {
  $schema: string
}

/**
 * configuration file name
 */
export const configFileName = 'linguify.config.json'

/**
 * config schema path
 */
export const configSchemaPath = 'https://raw.githubusercontent.com/rawand-faraidun/linguify/main/assets/schema.json'

/**
 * linguify default values
 */
export const defaultConfig: DefaultConfig = {
  $schema: configSchemaPath,
  localesPath: './public/locales',
  locales: ['en'],
  defaultLocale: 'en',
  useSingleFile: false,
  jsonIndentation: 2
}

/**
 * linguify default port
 */
export const defaultPort = 5678
