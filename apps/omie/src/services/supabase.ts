import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'
import { logger } from '../config/logger.js'
import {
  ServiceError,
  NotFoundError,
  TimeoutError,
  ValidationError,
  isAbortError,
} from '@aurea/shared/errors'

let supabaseClient: ReturnType<typeof createClient> | null = null

type SupabaseTable = 'celebridades' | 'regioes' | 'vendedores' | 'agencias'

export interface Celebridade {
  id: string | number
  nome: string
}

export interface Regiao {
  id: string | number
  nome: string
}

export interface Agencia {
  id: string | number
  nome: string
}

export interface Vendedor {
  id: string | number
  nome: string
  tem_agencia: boolean
  agencia_id: string | number | null
}

export interface VendedorEnriquecido {
  vendedor: Vendedor
  agencia: Agencia | null
}

function mapSupabaseError(
  error: unknown,
  table: SupabaseTable,
  operation: string
): ServiceError {
  if (error instanceof ServiceError) {
    if (error instanceof NotFoundError) {
      return new ServiceError(error.message, 400, 'SUPABASE_NOT_FOUND', {
        ...(error.context ?? {}),
        table,
        operation,
      })
    }

    return error
  }

  if (isAbortError(error)) {
    return new TimeoutError(`${table} (${operation})`, config.SUPABASE_TIMEOUT_MS, {
      table,
      operation,
    })
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message)
      : 'Erro desconhecido ao consultar Supabase'

  return new ServiceError(message, 503, 'SUPABASE_QUERY_ERROR', {
    table,
    operation,
  })
}

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const abortListener = () => controller.abort()

    if (init?.signal) {
      init.signal.addEventListener('abort', abortListener, { once: true })
    }

    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
      if (init?.signal) {
        init.signal.removeEventListener('abort', abortListener)
      }
    }
  }
}

async function fetchSingleById<T>(
  table: SupabaseTable,
  id: string | number,
  select: string
): Promise<T> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.from(table).select(select).eq('id', id).maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new NotFoundError(table, id)
    }

    return data as T
  } catch (error) {
    const mapped = mapSupabaseError(error, table, 'select')
    logger.warn({ error, table, id }, 'Erro ao consultar Supabase')
    throw mapped
  }
}

/**
 * Inicializa o cliente Supabase
 */
export function initializeSupabaseClient(): void {
  try {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_KEY, {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: createTimeoutFetch(config.SUPABASE_TIMEOUT_MS),
      },
    })

    logger.info('Cliente Supabase inicializado com sucesso')
  } catch (error) {
    logger.error({ error }, 'Erro ao inicializar cliente Supabase')
    throw error
  }
}

/**
 * ObtÃ©m o cliente Supabase (inicializa se necessÃ¡rio)
 */
export function getSupabaseClient(): ReturnType<typeof createClient> {
  if (!supabaseClient) {
    initializeSupabaseClient()
  }
  return supabaseClient!
}

/**
 * Verifica conectividade com Supabase
 */
export async function checkSupabaseConnection(): Promise<{
  status: 'ok' | 'error'
  message?: string
}> {
  try {
    const client = getSupabaseClient()

    // Fazer uma query simples para testar conectividade
    const { error } = await client.from('celebridades').select('id').limit(1)

    if (error) {
      logger.warn({ error }, 'Erro ao conectar com Supabase')
      return {
        status: 'error',
        message: `Erro de conexÃ£o: ${error.message}`,
      }
    }

    return { status: 'ok' }
  } catch (error) {
    logger.error({ error }, 'Erro ao verificar conectividade com Supabase')
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

export async function getCelebridadeById(id: string | number): Promise<Celebridade> {
  return fetchSingleById<Celebridade>('celebridades', id, 'id,nome')
}

export async function getRegiaoById(id: string | number): Promise<Regiao> {
  return fetchSingleById<Regiao>('regioes', id, 'id,nome')
}

export async function getVendedorById(id: string | number): Promise<Vendedor> {
  return fetchSingleById<Vendedor>('vendedores', id, 'id,nome,tem_agencia,agencia_id')
}

export async function getAgenciaById(id: string | number): Promise<Agencia> {
  return fetchSingleById<Agencia>('agencias', id, 'id,nome')
}

export interface OmieSyncUpsert {
  compra_id: string
  cliente_id?: string
  omie_cliente_id?: string
  omie_status: 'pending' | 'success' | 'error'
  last_error?: string
  attempts: number
  synced_at?: string
}

export async function upsertOmieSync(data: OmieSyncUpsert): Promise<void> {
  const client = getSupabaseClient()
  const { error } = await client
    .from('omie_sync')
    .upsert(data, { onConflict: 'compra_id' })

  if (error) {
    logger.error({ error, compra_id: data.compra_id }, 'Erro ao upsert omie_sync')
    throw new ServiceError(
      `Erro ao gravar omie_sync: ${error.message}`,
      503,
      'SUPABASE_UPSERT_ERROR',
      { table: 'omie_sync', compra_id: data.compra_id }
    )
  }
}

export async function fetchServiceSequence(): Promise<string> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.rpc('next_service_sequence')

    if (error || data === null || data === undefined) {
      throw new ServiceError(
        error?.message ?? 'Falha ao obter sequência de serviço',
        503,
        'SEQUENCE_UNAVAILABLE',
        { operation: 'next_service_sequence' }
      )
    }

    return String(data)
  } catch (error) {
    if (error instanceof ServiceError) throw error
    const mapped = mapSupabaseError(error, 'celebridades', 'rpc')
    throw mapped
  }
}

export async function getVendedorComAgencia(id: string | number): Promise<VendedorEnriquecido> {
  const vendedor = await getVendedorById(id)

  if (!vendedor.tem_agencia) {
    return { vendedor, agencia: null }
  }

  if (!vendedor.agencia_id) {
    throw new ValidationError('Vendedor marcado com agencia mas sem agencia_id', {
      vendedorId: vendedor.id,
    })
  }

  const agencia = await getAgenciaById(vendedor.agencia_id)
  return { vendedor, agencia }
}
