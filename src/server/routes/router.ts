import { Router } from 'express'

const router = Router()

/**
 * 404
 */
router.use((req, res) => {
  res.status(404).send('404 Not Found')
})

export default router
