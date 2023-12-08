import { existsSync, readdirSync, readFileSync } from 'fs'
import { extname, resolve } from 'path'
import chalk from 'chalk'
import { defaultConfig } from './defaults'
import type { Config } from './types'
import { config, configPath, rootPath } from './utils'

/**
 * get user config
 *
 * @returns user configurations
 */
export const getUserConfig = (): Config => {
  try {
    if (!existsSync(configPath)) return defaultConfig

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return Object.assign(defaultConfig, config)
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
export const getNamespaces = () =>
  (config.useSingleFile
    ? Object.keys(JSON.parse(readFileSync(getPath(`${config.defaultLocale}.json`), 'utf-8')))
    : readdirSync(getPath(config.defaultLocale)).filter(file => extname(file) == '.json')
  ).sort()

/**
 * gets content of a file as json
 *
 * @param paths - path to namespace
 *
 * @returns file json content
 */
export const getFileJson = (...paths: string[]) => JSON.parse(readFileSync(getPath(...paths), 'utf-8'))

/**
 * gets content of a namespace as json
 *
 * @param paths - path to namespace
 *
 * @returns namespace json content
 */
export const getNamespaceJson = (...paths: string[]) => {
  if (config.useSingleFile) {
    const path = paths.slice(0, paths.length - 1)
    if (!path[path.length - 1]?.toLowerCase().endsWith('.json')) {
      path[path.length - 1] = `${path[path.length - 1]}.json`
    }
    const namespace = paths[paths.length - 1]

    return getFileJson(...path)[namespace!]
  } else {
    return getFileJson(...paths)
  }
}

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
