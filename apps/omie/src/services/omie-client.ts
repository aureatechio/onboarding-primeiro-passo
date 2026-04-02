import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { config } from '../config/env.js'
import { ExternalApiError } from '@aurea/shared/errors'
import type { OmieContato } from '../transformers/omieTransformer.js'
import type { OmieOrdemServico } from '../transformers/osTransformer.js'
import type { OmieServico } from '../transformers/servicoTransformer.js'

const omieApi: AxiosInstance = axios.create({
  baseURL: config.OMIE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

interface OmieRequest {
  call: string
  app_key: string
  app_secret: string
  param: unknown[]
}

function buildOmieRequest(call: string, params: unknown): OmieRequest {
  return {
    call,
    app_key: config.OMIE_APP_KEY,
    app_secret: config.OMIE_APP_SECRET,
    param: [params],
  }
}

export function mapOmieError(error: unknown, operation: string): ExternalApiError {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ faultstring?: string; faultcode?: string }>

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
      return new ExternalApiError('OMIE', 'Timeout na comunicação com OMIE', 504, {
        operation,
      })
    }

    const status = axiosErr.response?.status
    const faultstring = axiosErr.response?.data?.faultstring ?? ''
    const faultcode = axiosErr.response?.data?.faultcode ?? ''

    if (faultstring.toLowerCase().includes('duplicado') || faultcode === '-53') {
      return new ExternalApiError('OMIE', `Registro duplicado: ${faultstring}`, 409, {
        operation,
      })
    }

    if (status && status >= 500) {
      return new ExternalApiError('OMIE', `Erro OMIE (${status}): ${faultstring}`, 503, {
        operation,
      })
    }

    return new ExternalApiError('OMIE', faultstring || axiosErr.message, status ?? 500, {
      operation,
    })
  }

  const message = error instanceof Error ? error.message : 'Erro desconhecido OMIE'
  return new ExternalApiError('OMIE', message, 500, { operation })
}

export async function incluirContato(contato: OmieContato): Promise<{ omie_codigo: string }> {
  try {
    const body = buildOmieRequest('IncluirContato', contato)
    const { data } = await omieApi.post('', body)
    return { omie_codigo: String(data.codigo_cliente_omie ?? data.codigo_cliente ?? data.codigo) }
  } catch (error) {
    throw mapOmieError(error, 'IncluirContato')
  }
}

export async function incluirOrdemServico(
  os: OmieOrdemServico
): Promise<{ nCodOS: string; cCodIntOS: string }> {
  try {
    const body = buildOmieRequest('IncluirOS', os)
    const { data } = await omieApi.post(
      config.OMIE_API_URL.replace(/geral\/clientes\/?$/, 'servicos/os/'),
      body
    )
    return {
      nCodOS: String(data.nCodOS ?? data.codigo),
      cCodIntOS: String(data.cCodIntOS ?? ''),
    }
  } catch (error) {
    throw mapOmieError(error, 'IncluirOS')
  }
}

export async function incluirCadastroServico(
  servico: OmieServico
): Promise<{ nCodServ: string }> {
  try {
    const body = buildOmieRequest('IncluirCadastroServico', servico)
    const { data } = await omieApi.post(
      config.OMIE_API_URL.replace(/geral\/clientes\/?$/, 'servicos/servico/'),
      body
    )
    return { nCodServ: String(data.nCodServ ?? data.codigo) }
  } catch (error) {
    throw mapOmieError(error, 'IncluirCadastroServico')
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? (error as { statusCode: number }).statusCode
          : 0
      if (statusCode > 0 && statusCode < 500) {
        throw error
      }
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
  throw lastError
}
