import chalk from 'chalk'
import { linguifyValidation } from '@lib/linguifyValidation'
import { syncNamespaces } from '@lib/syncNamespaces'
import { configPath } from '@lib/utils'

/**
 * sync linguify command
 */
const sync = async () => {
  try {
    // validating linguify configs
    linguifyValidation()

    // notifying user about config
    console.log(`Reading linguify config from ${chalk.cyan(chalk.underline(configPath))}`)

    // syncing namespaces
    syncNamespaces()

    console.log(chalk.green('Linguify synced successfully'))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

export default sync
