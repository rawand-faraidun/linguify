import { writeFileSync } from 'fs'
import chalk from 'chalk'
import xlsx from 'node-xlsx'
import { xlsxFileName } from '@lib/defaults'
import { getNamespaceJson, getNamespaces, getPath } from '@lib/functions'
import { linguifyValidation } from '@lib/linguifyValidation'
import { flatten } from '@lib/object'
import { syncNamespaces } from '@lib/syncNamespaces'
import type { DynamicObject } from '@lib/types'
import { config, otherLocales } from '@lib/utils'

/**
 * export translations command
 */
export const exportTranslations = async (path: string = getPath(xlsxFileName)) => {
  try {
    console.log(chalk.blue('Exporting linguify trnalsations to xlsx'))

    // validating linguify configs
    linguifyValidation()

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
