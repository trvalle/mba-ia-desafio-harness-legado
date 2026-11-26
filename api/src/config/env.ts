import path from 'node:path'
import { z } from 'zod'

export const env = {
  get DATABASE_URL() { return z.string().min(1).parse(process.env.DATABASE_URL) },
  get NODE_ENV() { return z.enum(['development', 'test', 'production']).default('development').parse(process.env.NODE_ENV) },
  get PORT() { return Number(process.env.PORT || 4000) },
  get WEB_ORIGIN() { return process.env.WEB_ORIGIN || 'http://localhost:5173' },
  get JWT_SECRET() { return process.env.JWT_SECRET || 'dev-secret' },
  get AI_MODE() { return process.env.AI_MODE || 'fake' },
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY },
  get UPLOAD_DIR() { return process.env.UPLOAD_DIR || path.resolve('.local/uploads') },
  get TRIAGE_INTERVAL_MS() { return Number(process.env.TRIAGE_INTERVAL_MS || 2000) },
}
