import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import startServer from './server/server'
import { defaultPort } from '@lib/defaults'
import { configPath, getUserConfig, rootPath } from '@lib/utils'

/**
 * start linguify command
 *
 * @param port - linguify server port
 */
const start = async (port: number = defaultPort) => {
  try {
    // user configs
    const configs = getUserConfig()

    /* 
    validating user config values
    */

    // checking the user configs localesPath
    if (!configs.localesPath) {
      throw new Error(chalk.yellow(`Linguify config file misses 'localesPath' key, please add it before starting`))
    }
    if (typeof configs.localesPath != 'string') {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not a string, please change it before starting`))
    }
    if (!existsSync(resolve(rootPath, configs.localesPath))) {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not found, please create the directory before starting`))
    }
    if (!statSync(resolve(rootPath, configs.localesPath)).isDirectory()) {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not a directory, please change it before starting`))
    }

    // checking locales
    if (!configs.locales) {
      throw new Error(chalk.yellow(`Linguify config file misses 'locales' key, please add it before starting`))
    }
    if (!Array.isArray(configs.locales)) {
      throw new Error(chalk.yellow(`Provided 'locales' is not an array, please change it before starting`))
    }
    if (configs.locales.some(locale => typeof locale != 'string')) {
      throw new Error(chalk.yellow(`Provided 'locales' is not an array of strings, please change it before starting`))
    }
    if (configs.locales.length == 0) {
      throw new Error(chalk.yellow(`Provided 'locales' array is empty, please change it before starting`))
    }

    // checking default locale
    if (!configs.defaultLocale) {
      throw new Error(chalk.yellow(`Linguify config file misses 'defaultLocale' key, please add it before starting`))
    }
    if (typeof configs.defaultLocale != 'string') {
      throw new Error(chalk.yellow(`Provided 'defaultLocale' is not a string, please change it before starting`))
    }
    if (!configs.locales.includes(configs.defaultLocale)) {
      throw new Error(
        chalk.yellow(`Provided 'localesPath' is not included in in 'locales', please change it before starting`)
      )
    }

    console.log(`Reading linguify configs from ${chalk.cyan(chalk.underline(configPath))}`)

    startServer(port)
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

export default start
