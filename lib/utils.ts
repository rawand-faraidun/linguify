import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import findup from 'findup-sync'
import { configFileName, defaultConfig } from './defaults'
import type { Configs } from './types'

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
    if (!existsSync(configPath))
      throw new Error(`Linguify config file is not found, initiate linguify with '${chalk.underline('linguify init')}'`)
    return JSON.parse(readFileSync(configPath, 'utf-8')) as Configs
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

/**
 * configurations
 */
export const config = { ...defaultConfig, ...getUserConfig() }
