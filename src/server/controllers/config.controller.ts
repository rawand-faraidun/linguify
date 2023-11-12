import { type RequestHandler } from 'express'
import { config, otherLocales } from '@lib/utils'

/**
 * gets linguify config
 */
export const getConfig: RequestHandler = (req, res) => {
  try {
    res.status(200).json({
      data: { ...config, otherLocales },
      success: true,
      message: 'Config retrieved successfully'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
