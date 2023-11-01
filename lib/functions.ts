import { existsSync, readdirSync, readFileSync } from 'fs'
import { extname, resolve } from 'path'
import chalk from 'chalk'
import type { Config } from './types'
import { config, configPath, rootPath } from './utils'

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
 * gets a path starting from from locales folder
 *
 * @param paths - paths to append
 *
 * @returns solved path string
 */
export const getPath = (...paths: string[]) => resolve(rootPath, config.localesPath, ...paths)

/**
 * gets current namespaces
 *
 * @returns array of namespaces
 */
export const getNamespaces = () => readdirSync(getPath(config.defaultLocale)).filter(file => extname(file) == '.json')

/**
 * gets content of a namespace as json
 *
 * @param paths - path to namespace
 *
 * @returns namespace json content
 */
export const getNamespaceJson = (...paths: string[]) => JSON.parse(readFileSync(getPath(...paths), 'utf-8'))

/**
 * checks if a namespace excists
 *
 * @param namespace - namespace to check `{namespace}.json`
 *
 * @returns is namespace excists
 */
export const isNamespaceExists = (namespace: string) => {
  return getNamespaces()
    .map(n => n.toLowerCase())
    .includes(namespace.toLowerCase())
}
