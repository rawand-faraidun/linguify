import { existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import prompts from 'prompts'
import { configFileName, defaultConfigsJs } from '../lib/defaults'

/**
 * initates linguify
 */
export const init = async () => {
  try {
    const currentDir = process.cwd()
    const configPath = resolve(currentDir, configFileName)

    console.log(chalk.blue('Initiating linguify'))

    // checking if the config file excists, if so asking to overwrite it
    if (existsSync(configPath)) {
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
    writeFileSync(configPath, defaultConfigsJs)
    console.log(chalk.blue(`Linguify configs saved to ${configPath} successfully`))

    console.log(chalk.green('Linguify initiated successfully'))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}
