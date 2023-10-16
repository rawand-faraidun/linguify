import { resolve } from 'path'
import express from 'express'
import { dirname } from 'dirname-filename-esm'

const __dirname = dirname(import.meta)

// this directory path is based on `dist` folder after build
const clientDir = resolve(__dirname, 'client')

const router = express.Router()

// static client
router.use(express.static(clientDir))

// client ui
router.get('*', (req, res) => {
  res.sendFile(resolve(clientDir, 'index.html'))
})

export default router
