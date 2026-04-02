import { config } from '../config/env.js'
import { logger } from '../config/logger.js'

/**
 * Verifica se as credenciais OMIE estão configuradas
 * (sem fazer chamada real à API)
 */
export function checkOmieCredentials(): {
  status: 'ok' | 'error'
  message?: string
} {
  try {
    if (!config.OMIE_APP_KEY || !config.OMIE_APP_SECRET) {
      return {
        status: 'error',
        message: 'Credenciais OMIE não configuradas',
      }
    }

    if (!config.OMIE_API_URL) {
      return {
        status: 'error',
        message: 'URL da API OMIE não configurada',
      }
    }

    // Validar formato da URL
    try {
      new URL(config.OMIE_API_URL)
    } catch {
      return {
        status: 'error',
        message: 'URL da API OMIE inválida',
      }
    }

    return { status: 'ok' }
  } catch (error) {
    logger.error({ error }, 'Erro ao verificar credenciais OMIE')
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
