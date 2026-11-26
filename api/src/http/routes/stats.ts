import { Router } from 'express'
import { getStats } from '../../services/system-service'
import { requireAuth, requireRole } from '../middlewares/auth'

const router = Router()

router.get('/', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    res.json(await getStats())
  } catch (err) {
    next(err)
  }
})

export default router
