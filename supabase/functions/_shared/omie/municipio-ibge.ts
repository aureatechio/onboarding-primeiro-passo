type SupabaseClientLike = {
  from: (table: string) => any
}

type ResolveMunicipioIbgeParams = {
  supabase: SupabaseClientLike
  cidade: string
  estado: string
  correlationId?: string | null
  allowExternalFallback?: boolean
}

type ResolveMunicipioIbgeDeps = {
  fetchFn?: typeof fetch
  now?: () => Date
}

export type ResolveMunicipioIbgeSuccess = {
  ok: true
  stateId: number
  uf: string
  cidadeNome: string
  ibgeCode: string
  source: 'local_exact' | 'local_normalized' | 'external_api'
}

export type ResolveMunicipioIbgeFailure = {
  ok: false
  code: 'STATE_NOT_FOUND' | 'IBGE_NOT_FOUND'
  message: string
  details?: Record<string, unknown>
}

export type ResolveMunicipioIbgeResult = ResolveMunicipioIbgeSuccess | ResolveMunicipioIbgeFailure

type EstadoRow = {
  id_sgc: number
  abbr: string
}

type CidadeRow = {
  name: string | null
  ibge_code: string | null
}

type ExternalMunicipio = {
  nome: string
  codigo_ibge: string
}

const DEFAULT_API_BASE_URL = 'https://brasilapi.com.br/api/ibge/municipios/v1'
const DEFAULT_API_TIMEOUT_MS = 4000

export const normalizeMunicipio = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

const toNonEmptyText = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const parseExternalMunicipios = (payload: unknown): ExternalMunicipio[] => {
  if (!Array.isArray(payload)) return []
  const entries: ExternalMunicipio[] = []

  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const nome = toNonEmptyText(record.nome ?? record.name)
    const codigo = toNonEmptyText(
      record.codigo_ibge ?? record.codigoIbge ?? record.ibge_code ?? record.id
    )
    if (!nome || !codigo) continue
    entries.push({ nome, codigo_ibge: codigo })
  }

  return entries
}

const resolveFallbackEnabled = (explicitValue?: boolean) => {
  if (typeof explicitValue === 'boolean') return explicitValue
  const envFlag = (Deno.env.get('OMIE_IBGE_FALLBACK_ENABLED') ?? 'true').trim().toLowerCase()
  return envFlag !== 'false' && envFlag !== '0' && envFlag !== 'no'
}

const fetchMunicipioFromExternalApi = async (
  cidade: string,
  uf: string,
  correlationId: string | null,
  deps: ResolveMunicipioIbgeDeps
): Promise<ExternalMunicipio | null> => {
  const fetchFn = deps.fetchFn ?? fetch
  const baseUrl = (Deno.env.get('OMIE_IBGE_API_BASE_URL') ?? DEFAULT_API_BASE_URL).replace(/\/$/, '')
  const timeoutMs = toPositiveNumber(Deno.env.get('OMIE_IBGE_API_TIMEOUT_MS')) ?? DEFAULT_API_TIMEOUT_MS
  const normalizedCity = normalizeMunicipio(cidade)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${baseUrl}/${encodeURIComponent(uf)}?providers=dados-abertos-br,gov`
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
      },
      signal: controller.signal,
    })

    if (!response.ok) return null
    const payload = await response.json()
    const municipios = parseExternalMunicipios(payload)
    const matched = municipios.find((entry) => normalizeMunicipio(entry.nome) === normalizedCity)
    return matched ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

const persistMunicipioCache = async (
  supabase: SupabaseClientLike,
  stateId: number,
  municipio: ExternalMunicipio,
  now: Date
) => {
  const { data: existing } = (await supabase
    .from('sgc_cidades')
    .select('name, ibge_code')
    .eq('state_id', stateId)
    .ilike('name', municipio.nome)
    .limit(1)
    .maybeSingle()) as { data: CidadeRow | null }

  if (existing) {
    await supabase
      .from('sgc_cidades')
      .update({
        name: municipio.nome,
        ibge_code: municipio.codigo_ibge,
      })
      .eq('state_id', stateId)
      .ilike('name', existing.name ?? municipio.nome)
    return
  }

  await supabase.from('sgc_cidades').insert({
    state_id: stateId,
    name: municipio.nome,
    ibge_code: municipio.codigo_ibge,
    imported_at: now.toISOString(),
    source_file: 'api:brasilapi:ibge_municipios',
  })
}

export const resolveMunicipioIbge = async (
  params: ResolveMunicipioIbgeParams,
  deps: ResolveMunicipioIbgeDeps = {}
): Promise<ResolveMunicipioIbgeResult> => {
  const cidade = params.cidade?.trim()
  const estado = params.estado?.trim().toUpperCase()
  if (!cidade || !estado) {
    return {
      ok: false,
      code: 'IBGE_NOT_FOUND',
      message: `Codigo IBGE nao encontrado para ${params.cidade}/${params.estado}`,
      details: { reason: 'invalid_input' },
    }
  }

  const { data: estadoData } = (await params.supabase
    .from('sgc_estados')
    .select('id_sgc, abbr')
    .eq('abbr', estado)
    .limit(1)
    .single()) as { data: EstadoRow | null }

  if (!estadoData?.id_sgc) {
    return {
      ok: false,
      code: 'STATE_NOT_FOUND',
      message: `Estado nao encontrado para ${params.estado}`,
    }
  }

  const { data: cidadeData } = (await params.supabase
    .from('sgc_cidades')
    .select('ibge_code, name')
    .ilike('name', cidade)
    .eq('state_id', estadoData.id_sgc)
    .limit(1)
    .single()) as { data: CidadeRow | null }

  if (cidadeData?.ibge_code) {
    return {
      ok: true,
      stateId: estadoData.id_sgc,
      uf: estadoData.abbr,
      cidadeNome: cidadeData.name,
      ibgeCode: cidadeData.ibge_code,
      source: 'local_exact',
    }
  }

  const { data: stateCities } = (await params.supabase
    .from('sgc_cidades')
    .select('name, ibge_code')
    .eq('state_id', estadoData.id_sgc)) as { data: CidadeRow[] | null }

  const normalizedCity = normalizeMunicipio(cidade)
  const normalizedMatch = (stateCities ?? []).find(
    (entry) => entry.ibge_code && entry.name && normalizeMunicipio(entry.name) === normalizedCity
  )

  if (normalizedMatch?.ibge_code) {
    return {
      ok: true,
      stateId: estadoData.id_sgc,
      uf: estadoData.abbr,
      cidadeNome: normalizedMatch.name,
      ibgeCode: normalizedMatch.ibge_code,
      source: 'local_normalized',
    }
  }

  const fallbackEnabled = resolveFallbackEnabled(params.allowExternalFallback)
  if (!fallbackEnabled) {
    return {
      ok: false,
      code: 'IBGE_NOT_FOUND',
      message: `Codigo IBGE nao encontrado para ${params.cidade}/${params.estado}`,
      details: { source: 'local_only' },
    }
  }

  const externalMatch = await fetchMunicipioFromExternalApi(
    cidade,
    estadoData.abbr,
    params.correlationId ?? null,
    deps
  )

  if (!externalMatch) {
    return {
      ok: false,
      code: 'IBGE_NOT_FOUND',
      message: `Codigo IBGE nao encontrado para ${params.cidade}/${params.estado}`,
      details: { source: 'local_and_external_miss' },
    }
  }

  await persistMunicipioCache(
    params.supabase,
    estadoData.id_sgc,
    externalMatch,
    (deps.now ?? (() => new Date()))()
  )

  return {
    ok: true,
    stateId: estadoData.id_sgc,
    uf: estadoData.abbr,
    cidadeNome: externalMatch.nome,
    ibgeCode: externalMatch.codigo_ibge,
    source: 'external_api',
  }
}
