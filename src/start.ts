import { watch } from 'fs'
import chalk from 'chalk'
import startServer from './server/server'
import { defaultPort } from '@lib/defaults'
import { linguifyValidation } from '@lib/linguifyValidation'
import { syncNamespaces } from '@lib/syncNamespaces'
import { configPath } from '@lib/utils'

/**
 * start linguify command
 *
 * @param port - linguify server port
 */
const start = async (port: number = defaultPort) => {
  try {
    // validating linguify configs
    linguifyValidation()

    // syncing namespaces
    syncNamespaces()

    // notifying user about config
    console.log(`Reading linguify config from ${chalk.cyan(chalk.underline(configPath))}`)

    // advising to not change locale and namespaces locale
    console.log(chalk.yellow(`Please avoid interacting with locales and namespaces manually while using linguify`))

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
