import { Router, type Request, type Response } from 'express'
import { logger } from '../config/logger.js'
import { checkSupabaseConnection } from '../services/supabase.js'
import { checkOmieCredentials } from '../services/omie.js'

const healthRouter = Router()

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  dependencies: {
    supabase: {
      status: 'ok' | 'error'
      message?: string
    }
    omie: {
      status: 'ok' | 'error'
      message?: string
    }
  }
}

healthRouter.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now()

  try {
    // Verificar conectividade com Supabase
    const supabaseStatus = await checkSupabaseConnection()

    // Verificar credenciais OMIE (sem fazer chamada real)
    const omieStatus = checkOmieCredentials()

    const dependencies = {
      supabase: supabaseStatus,
      omie: omieStatus,
    }

    // Determinar status geral
    const hasErrors =
      dependencies.supabase.status === 'error' || dependencies.omie.status === 'error'

    const status: HealthStatus = {
      status: hasErrors ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies,
    }

    const statusCode = hasErrors ? 503 : 200
    const responseTime = Date.now() - startTime

    logger.info(
      {
        healthCheck: {
          status: status.status,
          responseTime,
          dependencies,
        },
      },
      'Health check realizado'
    )

    res.status(statusCode).json(status)
  } catch (error) {
    logger.error({ error }, 'Erro ao realizar health check')

    const status: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        supabase: { status: 'error', message: 'Erro desconhecido' },
        omie: { status: 'error', message: 'Erro desconhecido' },
      },
    }

    res.status(503).json(status)
  }
})

export { healthRouter }
