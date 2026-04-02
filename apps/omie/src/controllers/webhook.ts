import { Router, type Request, type Response } from 'express'
import { contentTypeJsonMiddleware } from '../middlewares/contentTypeJson.js'
import { webhookAuthMiddleware } from '../middlewares/webhookAuth.js'
import { webhookRateLimiter } from '../middlewares/webhookRateLimit.js'
import { validateWebhookPayload } from '../validators/omieWebhook.js'
import { validateOsWebhookPayload } from '../validators/omieOrdemServico.js'
import { validateServicoWebhookPayload } from '../validators/omieServico.js'
import {
  getCelebridadeById,
  getRegiaoById,
  getVendedorComAgencia,
  upsertOmieSync,
  fetchServiceSequence,
} from '../services/supabase.js'
import { toOmieContato } from '../transformers/omieTransformer.js'
import { toOmieOrdemServico } from '../transformers/osTransformer.js'
import { toOmieServico } from '../transformers/servicoTransformer.js'
import {
  incluirContato,
  incluirOrdemServico,
  incluirCadastroServico,
  withRetry,
} from '../services/omie-client.js'
import { ExternalApiError, ServiceError } from '@aurea/shared/errors'
import { logger as rootLogger } from '../config/logger.js'

const webhookRouter = Router()

function handleError(
  error: unknown,
  res: Response,
  correlationId: string
): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId,
      },
    })
    return
  }

  if (error instanceof ExternalApiError) {
    res.status(error.statusCode).json({
      error: {
        code: 'OMIE_ERROR',
        message: error.message,
        correlationId,
      },
    })
    return
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
      correlationId,
    },
  })
}

async function persistSyncError(
  log: typeof rootLogger,
  compra_id: string,
  error: unknown
): Promise<void> {
  try {
    await upsertOmieSync({
      compra_id,
      omie_status: 'error',
      last_error: error instanceof Error ? error.message : String(error),
      attempts: 1,
    })
  } catch (syncError) {
    log.error({ syncError, compra_id }, 'Erro ao gravar falha em omie_sync')
  }
}

// --- Cliente ---
webhookRouter.post(
  '/omie/cliente',
  contentTypeJsonMiddleware,
  webhookAuthMiddleware,
  webhookRateLimiter,
  async (req: Request, res: Response) => {
    const log = res.locals.logger ?? rootLogger
    const correlationId = res.locals.correlationId ?? ''

    const validation = validateWebhookPayload(req.body)

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido',
          details: validation.errors,
        },
      })
      return
    }

    const payload = validation.data!
    const { compra_id } = payload
    const { cliente } = payload.dados

    try {
      log.info({ compra_id }, 'Iniciando processamento webhook OMIE')

      const [celebridade, regiao, vendedorEnriquecido] = await Promise.all([
        getCelebridadeById(cliente.celebridade.id),
        getRegiaoById(cliente.regiao.id),
        getVendedorComAgencia(cliente.vendedor.id),
      ])

      const omieContato = toOmieContato(payload, {
        celebridade,
        regiao,
        vendedorEnriquecido,
      })

      const result = await withRetry(() => incluirContato(omieContato))

      await upsertOmieSync({
        compra_id,
        omie_cliente_id: result.omie_codigo,
        omie_status: 'success',
        attempts: 1,
        synced_at: new Date().toISOString(),
      })

      log.info({ compra_id, omie_codigo: result.omie_codigo }, 'Contato criado com sucesso no OMIE')

      res.status(200).json({
        status: 'ok',
        omie_codigo: result.omie_codigo,
        correlationId,
      })
    } catch (error) {
      log.error({ error, compra_id }, 'Erro no processamento webhook OMIE')
      await persistSyncError(log, compra_id, error)
      handleError(error, res, correlationId)
    }
  }
)

// --- Ordem de Serviço ---
webhookRouter.post(
  '/omie/ordem-servico',
  contentTypeJsonMiddleware,
  webhookAuthMiddleware,
  webhookRateLimiter,
  async (req: Request, res: Response) => {
    const log = res.locals.logger ?? rootLogger
    const correlationId = res.locals.correlationId ?? ''

    const validation = validateOsWebhookPayload(req.body)

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido',
          details: validation.errors,
        },
      })
      return
    }

    const payload = validation.data!
    const { compra_id } = payload

    try {
      log.info({ compra_id }, 'Iniciando processamento webhook OMIE Ordem de Serviço')

      const omieOS = toOmieOrdemServico(payload)

      const result = await withRetry(() => incluirOrdemServico(omieOS))

      await upsertOmieSync({
        compra_id,
        omie_status: 'success',
        attempts: 1,
        synced_at: new Date().toISOString(),
      })

      log.info({ compra_id, nCodOS: result.nCodOS }, 'Ordem de Serviço criada com sucesso no OMIE')

      res.status(200).json({
        status: 'ok',
        nCodOS: result.nCodOS,
        cCodIntOS: result.cCodIntOS,
        correlationId,
      })
    } catch (error) {
      log.error({ error, compra_id }, 'Erro no processamento webhook OMIE Ordem de Serviço')
      await persistSyncError(log, compra_id, error)
      handleError(error, res, correlationId)
    }
  }
)

// --- Serviço ---
webhookRouter.post(
  '/omie/servico',
  contentTypeJsonMiddleware,
  webhookAuthMiddleware,
  webhookRateLimiter,
  async (req: Request, res: Response) => {
    const log = res.locals.logger ?? rootLogger
    const correlationId = res.locals.correlationId ?? ''

    const validation = validateServicoWebhookPayload(req.body)

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido',
          details: validation.errors,
        },
      })
      return
    }

    const payload = validation.data!
    const { compra_id } = payload

    try {
      log.info({ compra_id }, 'Iniciando processamento webhook OMIE Serviço')

      const sequence = await fetchServiceSequence()
      const omieServico = toOmieServico(payload, sequence)

      const result = await withRetry(() => incluirCadastroServico(omieServico))

      await upsertOmieSync({
        compra_id,
        omie_status: 'success',
        attempts: 1,
        synced_at: new Date().toISOString(),
      })

      log.info({ compra_id, nCodServ: result.nCodServ }, 'Serviço criado com sucesso no OMIE')

      res.status(200).json({
        status: 'ok',
        nCodServ: result.nCodServ,
        correlationId,
      })
    } catch (error) {
      log.error({ error, compra_id }, 'Erro no processamento webhook OMIE Serviço')
      await persistSyncError(log, compra_id, error)
      handleError(error, res, correlationId)
    }
  }
)

export { webhookRouter }
