import { program } from 'commander'
import { init } from './init'

/**
 * starting linguify
 */
program
  .command('start', { isDefault: true })
  .description('start linguify')
  .action(props => {
    console.log('start')
  })

/**
 * initiate linguify
 *
 * sets up the project and creates a `linguify.config.json` file
 */
program
  .command('init')
  .description('initiate linguify')
  .action(props => init())

program.parse(process.argv)
