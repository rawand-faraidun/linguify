import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import chalk from 'chalk'
import _ from 'lodash'
import { getFileJson, getNamespaceJson, getNamespaces, getPath } from './functions'
import { clear } from './object'
import type { DynamicObject } from './types'
import { config, otherLocales } from '@lib/utils'

/**
 * syncs all namespaces
 *
 * creates all for each locale
 */
export const syncNamespaces = () => {
  try {
    // checking or creating locale files
    config.locales.forEach(locale => {
      const path = config.useSingleFile ? getPath(`${locale}.json`) : getPath(locale)
      if (!existsSync(path)) {
        config.useSingleFile ? writeFileSync(path, '{}') : mkdirSync(path)
      } else {
        if (config.useSingleFile && !statSync(path).isFile()) {
          throw new Error(
            chalk.yellow(
              `Provided locale '${locale}' is not a valid json file '${locale}.json', please check if a directory exists with the same name, please change it before starting`
            )
          )
        } else if (!config.useSingleFile && !statSync(path).isDirectory()) {
          throw new Error(
            chalk.yellow(
              `Provided locale '${locale}' is not a valid directory name, please check if a file exists with the same name, please change it before starting`
            )
          )
        }
      }
    })

    // each namespace keys
    let nsKeys: DynamicObject = {}

    // getting default namespaces and keys
    if (config.useSingleFile) {
      const path = getPath(`${config.defaultLocale}.json`)
      const file = readFileSync(path, 'utf-8')
      let json: DynamicObject = {}
      try {
        json = clear(JSON.parse(file), { skipFirstDepth: true })
        writeFileSync(path, JSON.stringify(json, null, 2))
      } catch {
        writeFileSync(path, '{}')
      }
      nsKeys = json
    } else {
      // default locale namespaces
      const defaultNSs = getNamespaces()

      defaultNSs.forEach(ns => {
        const path = getPath(config.defaultLocale, ns)
        const file = readFileSync(path, 'utf-8')
        let json: DynamicObject = {}
        try {
          json = clear(JSON.parse(file))
          writeFileSync(path, JSON.stringify(json, null, 2))
        } catch {
          writeFileSync(path, '{}')
        }
        nsKeys[ns] = json
      })
    }

    // syncing keys with other files
    otherLocales.forEach(locale => {
      if (config.useSingleFile) {
        const path = getPath(`${locale}.json`)
        try {
          const json = clear(getFileJson(`${locale}.json`), { skipFirstDepth: true })
          writeFileSync(path, JSON.stringify(_.defaultsDeep(json, nsKeys), null, 2))
        } catch {
          writeFileSync(path, JSON.stringify(nsKeys, null, 2))
        }
      } else {
        Object.keys(nsKeys).forEach(ns => {
          const path = getPath(locale, ns)
          if (!existsSync(path)) {
            return writeFileSync(path, JSON.stringify({ ...nsKeys[ns] }, null, 2))
          }
          try {
            const json = clear(getNamespaceJson(locale, ns))
            writeFileSync(path, JSON.stringify(_.defaultsDeep(json, { ...nsKeys[ns] }), null, 2))
          } catch {
            writeFileSync(path, JSON.stringify({ ...nsKeys[ns] }, null, 2))
          }
        })
      }
    })
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
