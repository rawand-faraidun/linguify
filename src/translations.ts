import { readFileSync, writeFileSync } from 'fs'
import chalk from 'chalk'
import _ from 'lodash'
import xlsx from 'node-xlsx'
import { xlsxFileName } from '@lib/defaults'
import { getFileJson, getNamespaceJson, getNamespaces, getPath, isNamespaceExists } from '@lib/functions'
import { flatten, unflatten } from '@lib/object'
import { syncNamespaces } from '@lib/syncNamespaces'
import type { DynamicObject } from '@lib/types'
import { config, otherLocales } from '@lib/utils'

/**
 * import translations command
 */
export const importTranslations = async (path: string = getPath(xlsxFileName)) => {
  try {
    console.log(chalk.blue('Importing linguify trnalsations from xlsx'))

    // syncing namespaces
    syncNamespaces()

    // excel translations
    const translations = xlsx.parse(readFileSync(path))[0]
    if (!translations || !translations.data) throw new Error('Invalid translations file')

    // translations
    const [headers, ...data] = [...(translations.data as string[][])]
    if (!headers || !data) throw new Error('Invalid translations file')
    const locales = headers.filter(locale => locale != 'key')

    // locale namespace values
    const flattened: DynamicObject = {}
    locales.forEach(locale => {
      flattened[locale] = {}
    })

    // adding flattened locale namespaces
    data.forEach(row => {
      const [key, ...values] = row
      locales.forEach((locale, index) => {
        flattened[locale][key as string] = values[index]
      })
    })

    // adding the imported translation to the namespace
    config.locales.forEach(locale => {
      const unflattened = unflatten(flattened[locale])
      if (config.useSingleFile) {
        const filePath = getPath(`${locale}.json`)
        const json = getFileJson(`${locale}.json`)
        writeFileSync(filePath, JSON.stringify(_.defaultsDeep(unflattened, json), null, config.jsonIndentation))
      } else {
        Object.keys(unflattened).forEach(ns => {
          const filePath = getPath(locale, `${ns}.json`)
          try {
            if (!isNamespaceExists(`${ns}.json`)) throw new Error('')
            const json = getNamespaceJson(locale, `${ns}.json`)
            writeFileSync(filePath, JSON.stringify(_.defaultsDeep(unflattened[ns], json), null, config.jsonIndentation))
          } catch {
            writeFileSync(filePath, JSON.stringify(unflattened[ns], null, config.jsonIndentation))
          }
        })
      }
    })

    // syncing namespaces to add the missing properties
    syncNamespaces()

    console.log(chalk.green('Imported linguify trnalsations successfully'))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

/**
 * export translations command
 */
export const exportTranslations = async (path: string = getPath(xlsxFileName)) => {
  try {
    console.log(chalk.blue('Exporting linguify trnalsations to xlsx'))

    // syncing namespaces
    syncNamespaces()

    // namespaces
    const namespaces = getNamespaces()

    // locale namespace values
    const flattened: DynamicObject = {}

    // // adding flattened locale namespaces
    config.locales.forEach(locale => {
      flattened[locale] = flatten(
        namespaces.reduce<DynamicObject>(
          (obj, namespace) => ({ ...obj, [namespace]: getNamespaceJson(locale, namespace) }),
          {}
        )
      )
    })

    // table data
    const data = Object.entries(flattened[config.defaultLocale]).reduce<string[][]>((arr, [key, value]) => {
      const row = [key, value as string]
      otherLocales.forEach(locale => row.push(flattened[locale][key]))
      return [...arr, row]
    }, [])
    // table header
    data.unshift(['key', ...config.locales])

    // saving the file
    const buffer = xlsx.build([{ name: 'trnaslations', data, options: {} }])
    writeFileSync(path, buffer)

    console.log(chalk.green('Exported linguify trnalsations successfully'))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
