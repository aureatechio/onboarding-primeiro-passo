import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger.js'

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = crypto.randomUUID()
  res.locals.correlationId = correlationId
  res.locals.logger = logger.child({ correlationId })
  res.setHeader('X-Correlation-Id', correlationId)
  next()
}
