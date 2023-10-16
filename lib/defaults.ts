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

/**
 * linguify default configs file
 */
export const defaultConfigsJs = `
/** @type {import('linguify').Config} */
const configs = ${JSON.stringify(defaultConfigs, null, 2)}
module.exports = configs
`

/**
 * linguify default port
 */
export const defaultPort = 5678
