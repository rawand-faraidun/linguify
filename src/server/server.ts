import express from 'express'
import chalk from 'chalk'
import cors from 'cors'
import router from './routes/router'
import { defaultPort } from '@lib/defaults'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// application routes
app.use(router)

/**
 * start linguify server
 *
 * @param port - linguify server port
 */
const startServer = (port: number = defaultPort) => {
  try {
    app.listen(port, () => console.log(`Linguify started at ${chalk.blue(chalk.underline(`http://localhost:${port}`))}`))
  } catch (error: any) {
    console.error(chalk.red(error.message))
    process.exit(0)
  }
}

export default startServer
