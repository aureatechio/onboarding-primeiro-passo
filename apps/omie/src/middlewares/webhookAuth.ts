import { type Request, type Response, type NextFunction } from 'express'
import { config } from '../config/env.js'

export function webhookAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticação ausente ou inválido',
      },
    })
    return
  }

  const token = authHeader.replace('Bearer', '').trim()

  if (token !== config.WEBHOOK_SECRET) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticação ausente ou inválido',
      },
    })
    return
  }

  next()
}
