import express from 'express'
import * as controller from '../controllers/key.controller'

const router = express.Router({ mergeParams: true })

// create key
router.post('/', controller.createKey)

// update key
router.put('/', controller.updateKey)

// create key
router.delete('/', controller.deleteKeys)

export default router
