import { existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import prompts from 'prompts'
import { configFileName, defaultConfigs } from '../lib/defaults'

/**
 * initates linguify
 *
 * creates `linguify.config.json`
 */
export const init = async () => {
  try {
    const currentDir = process.cwd()

    console.log(chalk.blue('Initiating linguify'))

    // checking if the config file excists, if so asking to overwrite it
    if (existsSync(resolve(currentDir, configFileName))) {
      let { overwrite } = await prompts.prompt({
        type: 'toggle',
        name: 'overwrite',
        message: 'A linguify config file already exists. Do you want to overwrite it?',
        initial: false,
        active: 'yes',
        inactive: 'no'
      })

      if (!Boolean(overwrite)) {
        console.log(chalk.yellow('Exiting linguify initiating'))
        process.exit(1)
      }

      console.log(chalk.yellow('Overwriting linguify configs'))
    }

    // saving the configs file
    writeFileSync(resolve(currentDir, configFileName), JSON.stringify(defaultConfigs, null, 2))
    console.log(chalk.blue(`Linguify configs saved to ${resolve(currentDir, configFileName)} successfully`))

    console.log(chalk.green('Linguify initiated successfully'))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
