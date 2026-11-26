import { Router } from 'express'
import { checkHealth } from '../../services/system-service'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await checkHealth()
    res.json({ status: 'ok', db: 'ok' })
  } catch (err) {
    console.log('health: banco fora', err)
    res.status(503).json({ error: 'db_unavailable', message: 'Banco de dados não responde' })
  }
})

export default router
