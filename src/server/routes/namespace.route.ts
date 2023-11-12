import express from 'express'
import * as controller from '../controllers/namespace.controller'
import keyRoute from './key.route'

const router = express.Router()

// get namerspaces
router.get('/', controller.getNamespaces)

// get namespace
router.get('/:ns', controller.getNamespace)

// create namespace
router.post('/', controller.createNamespace)

// update namespace
router.put('/:ns', controller.updateNamespace)

// delete namespace
router.delete('/:ns', controller.deleteNamespace)

// namespace key routes
router.use('/:ns/key', keyRoute)

export default router
