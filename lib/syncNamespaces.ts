import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { extname, resolve } from 'path'
import chalk from 'chalk'
import _ from 'lodash'
import type { DynamicObject } from './types'
import { config, otherLanguages, rootPath } from '@lib/utils'

/**
 * syncs all namespaces
 *
 * creates all for each locale
 */
export const syncNamespaces = () => {
  try {
    // checking or creating locale files
    config.locales.forEach(locale => {
      const path = resolve(rootPath, config.localesPath, locale)
      if (!existsSync(path)) {
        mkdirSync(path)
      } else {
        if (!statSync(path).isDirectory()) {
          throw new Error(
            chalk.yellow(
              `Provided locale '${locale}' is not a valid directory name, please check if a file exists with the same name, please change it before starting`
            )
          )
        }
      }
    })

    // default locale namespaces
    const defaultNs = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // each namespace keys
    const nsKeys: DynamicObject = {}

    // getting default namespaces and keys
    defaultNs.forEach(ns => {
      const path = resolve(rootPath, config.localesPath, config.defaultLocale, ns)
      const file = readFileSync(path, 'utf-8')
      let json: DynamicObject = {}
      try {
        json = JSON.parse(file)
      } catch {
        writeFileSync(path, '{}')
      }
      nsKeys[ns] = json
    })

    // syncing keys with other files
    otherLanguages.forEach(locale => {
      Object.keys(nsKeys).forEach(ns => {
        const path = resolve(rootPath, config.localesPath, locale, ns)
        if (!existsSync(path)) {
          return writeFileSync(path, JSON.stringify({ ...nsKeys[ns] }))
        }
        const file = readFileSync(path, 'utf-8')
        let json: DynamicObject = {}
        try {
          json = JSON.parse(file)
          writeFileSync(path, JSON.stringify(_.defaultsDeep(json, { ...nsKeys[ns] })))
        } catch {
          writeFileSync(path, JSON.stringify({ ...nsKeys[ns] }))
        }
      })
    })
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
