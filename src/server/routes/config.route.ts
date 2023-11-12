import express from 'express'
import { getConfig } from '../controllers/config.controller'

const router = express.Router()

// get config
router.get('/', getConfig)

export default router
