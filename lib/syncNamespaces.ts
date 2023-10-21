import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { extname, resolve } from 'path'
import chalk from 'chalk'
import { config, rootPath } from '@lib/utils'

/**
 * dynamic object
 */
type DynamicObject = Record<string, object>

/**
 * namespace keys
 */
type NsKeys = Record<string, DynamicObject>

/**
 * syncs all namespaces
 *
 * creates all for each locale
 */
export const syncNamespaces = () => {
  try {
    // checking or creating locale files
    config.locales.forEach(locale => {
      if (!existsSync(resolve(rootPath, config.localesPath, locale))) {
        mkdirSync(resolve(rootPath, config.localesPath, locale))
      } else {
        if (!statSync(resolve(rootPath, config.localesPath, locale)).isDirectory()) {
          throw new Error(
            chalk.yellow(
              `Provided locale '${locale}' is not a valid directory name, please check if a file exists with the same name, please change it before starting`
            )
          )
        }
      }
    })

    // default locale namespaces
    let defaultNs = readdirSync(resolve(rootPath, config.localesPath, config.defaultLocale)).filter(
      file => extname(file) == '.json'
    )

    // each namespace keys
    let nsKeys: NsKeys = {}

    // getting default namespaces and keys
    defaultNs.forEach(ns => {
      let file = readFileSync(resolve(rootPath, config.localesPath, config.defaultLocale, ns), 'utf-8')
      let json: DynamicObject = {}
      try {
        json = JSON.parse(file)
      } catch {
        writeFileSync(resolve(rootPath, config.localesPath, config.defaultLocale, ns), '{}')
      }
      nsKeys[ns] = json
    })

    // syncing keys with other files
    config.locales
      .filter(l => l != config.defaultLocale)
      .forEach(locale => {
        Object.keys(nsKeys).forEach(ns => {
          if (!existsSync(resolve(rootPath, config.localesPath, locale, ns))) {
            return writeFileSync(resolve(rootPath, config.localesPath, locale, ns), JSON.stringify({ ...nsKeys[ns] }))
          }
          let file = readFileSync(resolve(rootPath, config.localesPath, locale, ns), 'utf-8')
          let json: DynamicObject = {}
          try {
            json = JSON.parse(file)
            writeFileSync(resolve(rootPath, config.localesPath, locale, ns), JSON.stringify({ ...nsKeys[ns], ...json }))
          } catch {
            writeFileSync(resolve(rootPath, config.localesPath, locale, ns), JSON.stringify({ ...nsKeys[ns] }))
          }
        })
      })
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
