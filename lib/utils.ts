import { existsSync, readdirSync, readFileSync } from 'fs'
import { extname, resolve } from 'path'
import chalk from 'chalk'
import findup from 'findup-sync'
import { configFileName, defaultConfig } from './defaults'
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
 * get user config
 *
 * @returns user configurations
 */
export const getUserConfig = () => {
  try {
    if (!existsSync(configPath)) return {} as Config
    return JSON.parse(readFileSync(configPath, 'utf-8')) as Config
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

/**
 * configuration
 */
export const config = { ...defaultConfig, ...getUserConfig() }

/**
 * other languages from config
 */
export const otherLanguages = config.locales.filter(locale => locale !== config.defaultLocale)

/**
 * gets current namespaces
 *
 * @returns array of namespaces
 */
export const getNamespaces = () =>
  readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(file => extname(file) == '.json')
