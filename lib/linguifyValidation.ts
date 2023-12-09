import { existsSync, statSync } from 'fs'
import chalk from 'chalk'
import { getPath, getUserConfig } from './functions'
import { configPath } from './utils'

/**
 * validates linguify config
 */
export const linguifyValidation = () => {
  try {
    // checking if the config file excists
    if (!existsSync(configPath)) {
      throw new Error(`Linguify config file is not found, initiate linguify with '${chalk.underline('linguify init')}'`)
    }

    // user config
    const config = getUserConfig()

    // checking the user config localesPath
    if (!config.localesPath) {
      throw new Error(chalk.yellow(`Linguify config file misses 'localesPath' key, please add it before starting`))
    }
    if (typeof config.localesPath != 'string') {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not a string, please change it before starting`))
    }
    if (!existsSync(getPath())) {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not found, please create the directory before starting`))
    }
    if (!statSync(getPath()).isDirectory()) {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not a directory, please change it before starting`))
    }

    // checking locales
    if (!config.locales) {
      throw new Error(chalk.yellow(`Linguify config file misses 'locales' key, please add it before starting`))
    }
    if (!Array.isArray(config.locales)) {
      throw new Error(chalk.yellow(`Provided 'locales' is not an array, please change it before starting`))
    }
    if (config.locales.some(locale => typeof locale != 'string')) {
      throw new Error(chalk.yellow(`Provided 'locales' is not an array of strings, please change it before starting`))
    }
    if (config.locales.length == 0) {
      throw new Error(chalk.yellow(`Provided 'locales' array is empty, please change it before starting`))
    }

    // checking default locale
    if (!config.defaultLocale) {
      throw new Error(chalk.yellow(`Linguify config file misses 'defaultLocale' key, please add it before starting`))
    }
    if (typeof config.defaultLocale != 'string') {
      throw new Error(chalk.yellow(`Provided 'defaultLocale' is not a string, please change it before starting`))
    }
    if (!config.locales.includes(config.defaultLocale)) {
      throw new Error(
        chalk.yellow(`Provided 'defaultLocale' is not included in in 'locales', please change it before starting`)
      )
    }

    // checking useSingleFile
    if (typeof config.useSingleFile == 'undefined') {
      throw new Error(chalk.yellow(`Linguify config file misses 'useSingleFile' key, please add it before starting`))
    }
    if (typeof config.useSingleFile != 'boolean') {
      throw new Error(chalk.yellow(`Provided 'useSingleFile' is not boolean, please change it before starting`))
    }

    // checking jsonIndentation
    // can be undefined, but must be number
    if (typeof config.jsonIndentation != 'undefined' && typeof config.jsonIndentation != 'number') {
      throw new Error(chalk.yellow(`Provided 'jsonIndentation' is not number, please change it before starting`))
    }
    if (config.jsonIndentation < 0) {
      throw new Error(chalk.yellow(`Provided 'jsonIndentation' is invalid, please change it before starting`))
    }
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
