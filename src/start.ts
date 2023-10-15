import { existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import prompts from 'prompts'
import init from './init'
import { configFileName, defaultPort } from '@lib/defaults'

/**
 * start linguify command
 * 
 * @param port - linguify server port
 */
const start = async (port: number = defaultPort) => {
  try {
    const currentDir = process.cwd()
    const configPath = resolve(currentDir, configFileName)

    // checking if config file excists, if not asking to create
    if (!existsSync(configPath)) {
      console.log(chalk.red('Linguify config file not found'))

      let { createFile } = await prompts.prompt({
        type: 'toggle',
        name: 'createFile',
        message: 'Linguify config file not found, do you want to create one?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      })

      if (Boolean(createFile)) {
        await init()
        console.log(`Reading linguify configs from ${chalk.cyan(chalk.underline(configPath))}`)
      } else {
        console.log(chalk.yellow('Reading linguify configs from default configs, NOT RECOMMENDED'))
      }
    } else {
      console.log(`Reading linguify configs from ${chalk.cyan(chalk.underline(configPath))}`)
    }
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

export default start
