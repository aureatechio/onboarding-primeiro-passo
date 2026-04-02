import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

type JsonRecord = Record<string, unknown>

type CelebProjetoRow = {
  celebridade_id: string
  omie_projeto_id: number
  omie_projeto_cod_int: string
  omie_projeto_nome: string | null
}

type EnsureMode = 'apply' | 'preview'
type ProjetoSource = 'db' | 'omie_cod_int' | 'omie_nome' | 'omie_incluir' | 'preview_unresolved'

type EnsureProjetoInput = {
  supabase: SupabaseClient
  celebridadeId: string
  celebridadeNome: string
  mode?: EnsureMode
  correlationId?: string
}

export type EnsureProjetoResult = {
  nCodProj: number | null
  codInt: string
  source: ProjetoSource
  warning?: string
}

export class OmieProjetoEnsureError extends Error {
  code: string
  details?: JsonRecord

  constructor(code: string, message: string, details?: JsonRecord) {
    super(message)
    this.name = 'OmieProjetoEnsureError'
    this.code = code
    this.details = details
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const normalizeSpacing = (value: string): string => value.trim().replace(/\s+/g, ' ')

const normalizeForCompare = (value: string): string =>
  normalizeSpacing(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const extractFaultMessage = (data: JsonRecord | null): string | null =>
  (typeof data?.faultstring === 'string' && data.faultstring.trim() !== ''
    ? data.faultstring.trim()
    : null) ??
  (typeof data?.faultcode === 'string' && data.faultcode.trim() !== ''
    ? data.faultcode.trim()
    : null)

const isNotFoundFault = (message: string): boolean =>
  /(nao|não).*encontr|inexistente|nao cadastrad|não cadastrad/i.test(message)

const isDuplicateFault = (message: string): boolean =>
  /duplic|j[aá]\s*cadastrad|c[oó]digo.*integr/i.test(message)

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504])

const isTransientOmieError = (error: unknown): boolean => {
  if (!(error instanceof OmieProjetoEnsureError)) return false
  if (error.code === 'OMIE_PROJECT_TIMEOUT' || error.code === 'OMIE_PROJECT_REQUEST_FAILED') {
    return true
  }
  if (error.code === 'OMIE_PROJECT_HTTP_ERROR') {
    const status = typeof error.details?.status === 'number' ? error.details.status : 0
    return RETRYABLE_HTTP_STATUSES.has(status)
  }
  return false
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const CONSULT_RETRY_DELAYS_MS = [300, 700, 1500]

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return null
}

const firstDefined = (obj: JsonRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = obj[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const getProjetoCodigo = (item: JsonRecord): number | null =>
  toPositiveInt(firstDefined(item, ['codigo', 'nCodigo', 'nCodProj', 'nCodProjeto']))

const getProjetoCodInt = (item: JsonRecord): string | null => {
  const raw = firstDefined(item, ['codInt', 'codint', 'cCodInt'])
  if (typeof raw !== 'string') return null
  const normalized = raw.trim()
  return normalized.length > 0 ? normalized : null
}

const getProjetoNome = (item: JsonRecord): string | null => {
  const raw = firstDefined(item, ['nome', 'cNome'])
  if (typeof raw !== 'string') return null
  const normalized = normalizeSpacing(raw)
  return normalized.length > 0 ? normalized : null
}

const getProjetosApiUrl = (): string => {
  const base = (Deno.env.get('OMIE_BASE_URL') ?? 'https://app.omie.com.br/api/v1').replace(/\/$/, '')
  return (Deno.env.get('OMIE_PROJETOS_API_URL') ?? `${base}/geral/projetos/`).trim()
}

const getOmieCredentials = () => {
  const appKey = (Deno.env.get('OMIE_APP_KEY') ?? '').trim()
  const appSecret = (Deno.env.get('OMIE_APP_SECRET') ?? '').trim()
  if (!appKey || !appSecret) {
    throw new OmieProjetoEnsureError(
      'OMIE_PROJECT_CONFIG_MISSING',
      'OMIE_APP_KEY/OMIE_APP_SECRET ausentes para sincronizacao de projeto'
    )
  }
  return { appKey, appSecret }
}

const omieFetch = async (
  apiUrl: string,
  call: string,
  param: JsonRecord,
  timeoutMs = 10000
): Promise<JsonRecord> => {
  const { appKey, appSecret } = getOmieCredentials()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        call,
        app_key: appKey,
        app_secret: appSecret,
        param: [param],
      }),
    })

    const data = (await response.json().catch(() => ({}))) as JsonRecord
    if (!response.ok) {
      throw new OmieProjetoEnsureError(
        'OMIE_PROJECT_HTTP_ERROR',
        `OMIE ${call} falhou: HTTP ${response.status}`,
        { call, status: response.status }
      )
    }
    return data
  } catch (error) {
    if (error instanceof OmieProjetoEnsureError) throw error
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    throw new OmieProjetoEnsureError(
      isTimeout ? 'OMIE_PROJECT_TIMEOUT' : 'OMIE_PROJECT_REQUEST_FAILED',
      isTimeout ? `Timeout em ${call}` : `Falha em ${call}: ${String(error)}`,
      { call }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

type ConsultResult = {
  resolved: { codigo: number; nome: string | null } | null
  transientError?: OmieProjetoEnsureError
}

const consultarProjetoPorCodInt = async (
  apiUrl: string,
  codInt: string
): Promise<{ codigo: number; nome: string | null } | null> => {
  const result = await consultarProjetoPorCodIntResilient(apiUrl, codInt)
  if (result.transientError) throw result.transientError
  return result.resolved
}

const consultarProjetoPorCodIntResilient = async (
  apiUrl: string,
  codInt: string
): Promise<ConsultResult> => {
  let lastError: OmieProjetoEnsureError | undefined
  const maxAttempts = 1 + CONSULT_RETRY_DELAYS_MS.length

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(CONSULT_RETRY_DELAYS_MS[attempt - 1])
    }

    try {
      const data = await omieFetch(apiUrl, 'ConsultarProjeto', { codInt })
      const fault = extractFaultMessage(data)
      if (fault) {
        if (isNotFoundFault(fault)) return { resolved: null }
        throw new OmieProjetoEnsureError(
          'OMIE_PROJECT_CONSULT_FAILED',
          `ConsultarProjeto: ${fault}`,
          { codInt, fault }
        )
      }

      const codigo = getProjetoCodigo(data)
      if (!codigo) return { resolved: null }
      return { resolved: { codigo, nome: getProjetoNome(data) } }
    } catch (error) {
      if (!isTransientOmieError(error)) throw error
      lastError = error as OmieProjetoEnsureError
      console.warn(
        `[OMIE_PROJETO] ConsultarProjeto transient error (attempt ${attempt + 1}/${maxAttempts}): ${lastError.message}`
      )
    }
  }

  return { resolved: null, transientError: lastError }
}

const listProjectsByName = async (
  apiUrl: string,
  nomeProjeto: string,
  codInt: string
): Promise<{ codigo: number; nome: string | null } | null> => {
  const normalizedTargetName = normalizeForCompare(nomeProjeto)
  const maxPages = 5

  for (let page = 1; page <= maxPages; page++) {
    const data = await omieFetch(apiUrl, 'ListarProjetos', {
      pagina: page,
      registros_por_pagina: 50,
      apenas_importado_api: 'N',
      nome_projeto: nomeProjeto,
    })

    const fault = extractFaultMessage(data)
    if (fault) {
      throw new OmieProjetoEnsureError('OMIE_PROJECT_LIST_FAILED', `ListarProjetos: ${fault}`, {
        codInt,
        nomeProjeto,
        page,
        fault,
      })
    }

    const cadastro = Array.isArray(data.cadastro) ? (data.cadastro as JsonRecord[]) : []
    if (!cadastro.length) {
      if (page === 1) return null
      break
    }

    const byCodInt = cadastro.find((item) => getProjetoCodInt(item) === codInt)
    if (byCodInt) {
      const codigo = getProjetoCodigo(byCodInt)
      if (codigo) return { codigo, nome: getProjetoNome(byCodInt) }
    }

    const byName = cadastro.find((item) => {
      const nome = getProjetoNome(item)
      if (!nome) return false
      return normalizeForCompare(nome) === normalizedTargetName
    })
    if (byName) {
      const codigo = getProjetoCodigo(byName)
      if (codigo) return { codigo, nome: getProjetoNome(byName) }
    }

    const totalPages = toPositiveInt(data.total_de_paginas) ?? page
    if (page >= totalPages) break
  }

  return null
}

const incluirProjeto = async (
  apiUrl: string,
  codInt: string,
  nomeProjeto: string
): Promise<{ codigo: number; nome: string | null } | null> => {
  const data = await omieFetch(apiUrl, 'IncluirProjeto', {
    codInt,
    nome: nomeProjeto,
    inativo: 'N',
  })

  const fault = extractFaultMessage(data)
  if (fault) {
    if (isDuplicateFault(fault)) return null
    throw new OmieProjetoEnsureError('OMIE_PROJECT_INCLUDE_FAILED', `IncluirProjeto: ${fault}`, {
      codInt,
      nomeProjeto,
      fault,
    })
  }

  const codigo = getProjetoCodigo(data)
  if (!codigo) {
    return consultarProjetoPorCodInt(apiUrl, codInt)
  }
  return { codigo, nome: getProjetoNome(data) ?? nomeProjeto }
}

const loadExistingMap = async (
  supabase: SupabaseClient,
  celebridadeId: string
): Promise<CelebProjetoRow | null> => {
  const { data, error } = await supabase
    .from('celebridade_omie_projeto')
    .select('celebridade_id, omie_projeto_id, omie_projeto_cod_int, omie_projeto_nome')
    .eq('celebridade_id', celebridadeId)
    .maybeSingle()

  if (error) {
    throw new OmieProjetoEnsureError(
      'OMIE_PROJECT_MAP_QUERY_FAILED',
      `Falha ao consultar mapeamento local de projeto: ${error.message}`
    )
  }
  return (data as CelebProjetoRow | null) ?? null
}

const upsertMap = async (
  supabase: SupabaseClient,
  payload: {
    celebridadeId: string
    celebridadeNome: string
    omieProjetoId: number
    omieProjetoCodInt: string
    omieProjetoNome: string
    source: string
  }
) => {
  const nowIso = new Date().toISOString()
  const { error } = await supabase.from('celebridade_omie_projeto').upsert(
    {
      celebridade_id: payload.celebridadeId,
      celebridade_nome: payload.celebridadeNome,
      omie_projeto_id: payload.omieProjetoId,
      omie_projeto_cod_int: payload.omieProjetoCodInt,
      omie_projeto_nome: payload.omieProjetoNome,
      source: payload.source,
      synced_at: nowIso,
      updated_at: nowIso,
      last_error: null,
    },
    {
      onConflict: 'celebridade_id',
    }
  )

  if (!error) return

  if (/celebridade_omie_projeto_omie_projeto_cod_int_key|duplicate key/i.test(error.message ?? '')) {
    const { data: rowByCodInt, error: rowError } = await supabase
      .from('celebridade_omie_projeto')
      .select('celebridade_id, omie_projeto_id')
      .eq('omie_projeto_cod_int', payload.omieProjetoCodInt)
      .maybeSingle()
    if (rowError) {
      throw new OmieProjetoEnsureError(
        'OMIE_PROJECT_MAP_PERSIST_FAILED',
        `Falha ao validar conflito de codInt: ${rowError.message}`
      )
    }
    if (rowByCodInt && rowByCodInt.celebridade_id !== payload.celebridadeId) {
      throw new OmieProjetoEnsureError(
        'OMIE_PROJECT_MAP_CONFLICT',
        'codInt de projeto ja associado a outra celebridade',
        {
          codInt: payload.omieProjetoCodInt,
          celebridade_id_atual: rowByCodInt.celebridade_id,
          celebridade_id_nova: payload.celebridadeId,
        }
      )
    }
  }

  throw new OmieProjetoEnsureError(
    'OMIE_PROJECT_MAP_PERSIST_FAILED',
    `Falha ao persistir mapeamento de projeto: ${error.message}`
  )
}

const normalizeNomeProjeto = (celebridadeNome: string): string => {
  const normalized = normalizeSpacing(celebridadeNome)
  if (!normalized) {
    throw new OmieProjetoEnsureError(
      'OMIE_PROJECT_NAME_INVALID',
      'Nome da celebridade invalido para cadastro de projeto OMIE'
    )
  }
  return normalized.slice(0, 70)
}

const sha256Hex = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const buildOmieProjetoCodInt = async (celebridadeId: string): Promise<string> => {
  const normalized = celebridadeId.trim()
  if (!normalized) {
    throw new OmieProjetoEnsureError(
      'OMIE_PROJECT_ID_INVALID',
      'celebridade_id ausente para gerar codInt do projeto'
    )
  }

  const hexSource = UUID_REGEX.test(normalized)
    ? normalized.replace(/-/g, '').toUpperCase()
    : (await sha256Hex(normalized)).toUpperCase()
  return `CEL_${hexSource.slice(0, 16)}`
}

export const ensureOmieProjetoForCelebridade = async ({
  supabase,
  celebridadeId,
  celebridadeNome,
  mode = 'apply',
}: EnsureProjetoInput): Promise<EnsureProjetoResult> => {
  const normalizedCelebridadeId = celebridadeId.trim()
  if (!normalizedCelebridadeId) {
    throw new OmieProjetoEnsureError('OMIE_PROJECT_ID_INVALID', 'celebridade_id ausente')
  }

  const normalizedNomeProjeto = normalizeNomeProjeto(celebridadeNome)
  const codInt = await buildOmieProjetoCodInt(normalizedCelebridadeId)

  const existingMap = await loadExistingMap(supabase, normalizedCelebridadeId)
  if (existingMap?.omie_projeto_id && existingMap.omie_projeto_id > 0) {
    return {
      nCodProj: existingMap.omie_projeto_id,
      codInt: existingMap.omie_projeto_cod_int || codInt,
      source: 'db',
    }
  }

  if (mode === 'preview') {
    return {
      nCodProj: null,
      codInt,
      source: 'preview_unresolved',
      warning:
        'OMIE_PROJECT_PREVIEW_UNRESOLVED: celebridade sem mapeamento local de projeto OMIE; preview nao cria projeto externamente',
    }
  }

  const apiUrl = getProjetosApiUrl()

  let consultDegraded = false
  let consultDegradedMessage = ''
  const consultResult = await consultarProjetoPorCodIntResilient(apiUrl, codInt)

  let resolved = consultResult.resolved
  let source: ProjetoSource = 'omie_cod_int'

  if (!resolved && consultResult.transientError) {
    consultDegraded = true
    consultDegradedMessage = `OMIE_PROJECT_CONSULT_DEGRADED: ${consultResult.transientError.message}`
    console.warn(`[OMIE_PROJETO] ${consultDegradedMessage} — seguindo fallback por nome/inclusao`)
  }

  if (!resolved) {
    resolved = await listProjectsByName(apiUrl, normalizedNomeProjeto, codInt)
    source = 'omie_nome'
  }

  if (!resolved) {
    resolved = await incluirProjeto(apiUrl, codInt, normalizedNomeProjeto)
    source = 'omie_incluir'
  }

  if (!resolved) {
    resolved = await consultarProjetoPorCodInt(apiUrl, codInt)
    source = 'omie_cod_int'
  }

  if (!resolved?.codigo || resolved.codigo <= 0) {
    throw new OmieProjetoEnsureError(
      'OMIE_PROJECT_UNRESOLVED',
      'Nao foi possivel resolver/cadastrar projeto OMIE da celebridade',
      {
        celebridade_id: normalizedCelebridadeId,
        codInt,
        nome_projeto: normalizedNomeProjeto,
        consult_degraded: consultDegraded,
      }
    )
  }

  await upsertMap(supabase, {
    celebridadeId: normalizedCelebridadeId,
    celebridadeNome: normalizedNomeProjeto,
    omieProjetoId: resolved.codigo,
    omieProjetoCodInt: codInt,
    omieProjetoNome: resolved.nome ?? normalizedNomeProjeto,
    source,
  })

  return {
    nCodProj: resolved.codigo,
    codInt,
    source,
    ...(consultDegraded ? { warning: consultDegradedMessage } : {}),
  }
}
