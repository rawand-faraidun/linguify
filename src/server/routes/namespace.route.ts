import express from 'express'
import * as controller from '../controllers/namespace.controller'

const router = express.Router()

// get namerspaces
router.get('/', controller.getNamespaces)

// create namespace
router.post('/', controller.createNamespace)

// update namespace
router.put('/:ns', controller.updateNamespace)

// delete namespace
router.delete('/:ns', controller.deleteNamespace)

export default router
