import { type RequestHandler } from 'express'
import chalk from 'chalk'
import { config } from '@lib/utils'

/**
 * gets linguify config
 */
export const getConfig: RequestHandler = (req, res) => {
  try {
    res.status(200).json({
      data: config,
      success: true,
      message: 'Config retrieved successfully'
    })
  } catch (error: any) {
    console.error(chalk.red(error.message))
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
