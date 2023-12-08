import { resolve } from 'path'
import findup from 'findup-sync'
import { configFileName, defaultConfig } from './defaults'
import { getUserConfig } from './functions'
import type { Config } from './types'

/**
 * `node_modules` path, used to detect root
 */
const nodePath = findup('node_modules')

/**
 * `package.json` path, used to detect root
 */
const packagePath = findup('package.json')

/**
 * root directory path
 *
 * based on `node_modules` or `package.json`, using `process.cwd()` if none of them found
 */
export const rootPath = resolve(
  nodePath ? resolve(nodePath, '../') : packagePath ? resolve(packagePath, '../') : process.cwd()
)

/**
 * configurations file path based on `rootPath`
 */
export const configPathRoot = resolve(rootPath, configFileName)

/**
 * found configurations file path based on findup
 *
 * expected to be equal to `configPath`
 */
export const configPathExpected = findup(configFileName)

/**
 * configurations file path
 */
export const configPath = configPathExpected || configPathRoot

/**
 * configuration
 */
export const config: Config = getUserConfig();

/**
 * other languages from config
 */
export const otherLocales = config.locales.filter(locale => locale !== config.defaultLocale)
