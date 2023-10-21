import express from 'express'
import { createNamespace, getNamespaces } from '../controllers/namespace.controller'

const router = express.Router()

// get namerspaces
router.get('/', getNamespaces)

// create namespace
router.post('/', createNamespace)

export default router
