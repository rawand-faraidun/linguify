import { resolve } from 'path'
import express from 'express'
import { dirname } from 'dirname-filename-esm'
import configRoute from './config.route'
import namespaceRoute from './namespace.route'

// this directory path is based on `dist` folder after build
const __dirname = dirname(import.meta)
const clientDir = resolve(__dirname, 'client')

const router = express.Router()

// static client
router.use(express.static(clientDir))

/* 
routes
*/
router.use('/config', configRoute)
router.use('/namespace', namespaceRoute)

// client ui
router.get('*', (req, res) => {
  res.sendFile(resolve(clientDir, 'index.html'))
})

export default router
