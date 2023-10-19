import { existsSync, statSync, watch } from 'fs'
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
    // user config
    const config = getUserConfig()

    /* 
    validating user config values
    */

    // checking if the config file excists
    if (!existsSync(configPath)) {
      throw new Error(`Linguify config file is not found, initiate linguify with '${chalk.underline('linguify init')}'`)
    }

    // checking the user config localesPath
    if (!config.localesPath) {
      throw new Error(chalk.yellow(`Linguify config file misses 'localesPath' key, please add it before starting`))
    }
    if (typeof config.localesPath != 'string') {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not a string, please change it before starting`))
    }
    if (!existsSync(resolve(rootPath, config.localesPath))) {
      throw new Error(chalk.yellow(`Provided 'localesPath' is not found, please create the directory before starting`))
    }
    if (!statSync(resolve(rootPath, config.localesPath)).isDirectory()) {
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
        chalk.yellow(`Provided 'localesPath' is not included in in 'locales', please change it before starting`)
      )
    }
    

    // notifying user about config
    console.log(`Reading linguify config from ${chalk.cyan(chalk.underline(configPath))}`)

    // starting linguify server
    startServer(port)

    // watching config file for changes
    watch(configPath, () => {
      console.log(chalk.yellow('The linguify config file has been changed, please restart linguify to apply changes'))
    })
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

export default start
