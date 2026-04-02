import { type Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const isTestEnv = process.env.NODE_ENV === 'test'
const windowMs = Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? 60_000)
const limit = Number(process.env.WEBHOOK_RATE_LIMIT_MAX ?? 100)

function resolveRateLimitKey(req: Request): string {
  if (isTestEnv) {
    const overrideKey = req.headers['x-rate-limit-key']
    if (typeof overrideKey === 'string' && overrideKey.trim().length > 0) {
      return overrideKey
    }
  }
  return ipKeyGenerator(req) ?? 'unknown'
}

export const webhookRateLimiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  keyGenerator: resolveRateLimitKey,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de requisições excedido',
      },
    })
  },
})
