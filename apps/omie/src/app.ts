import express, { type NextFunction, type Request, type Response } from 'express'
import { healthRouter } from './controllers/health.js'
import { webhookRouter } from './controllers/webhook.js'
import { correlationIdMiddleware } from './middlewares/correlationId.js'

const app = express()

// Correlation ID first — ensures every request (including malformed JSON) gets tracing
app.use(correlationIdMiddleware)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rotas
app.use('/health', healthRouter)
app.use('/api/webhook', webhookRouter)

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    const correlationId = res.locals.correlationId ?? ''
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'JSON malformado',
        correlationId,
      },
    })
    return
  }

  next(error)
})

app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const correlationId = res.locals.correlationId ?? ''
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
      correlationId,
    },
  })
})

export default app
