import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  buildCanonicalOsPayload,
  buildObservacoesFromPayment,
  buildPagamentosLabel,
  normalizeDescricaoServico,
} from '../_shared/omie/canonical-os-payload.ts'
import {
  centavosToReais,
  parseMoneyToCentavos,
  parseReaisToCentavos,
  resolveValorTotalCentavos,
  resolveValorTotalCentavosForSplit,
} from '../_shared/omie/money.ts'
import {
  buildParcelasFromSessions,
  PARCELAS_SESSION_COLUMNS,
  type PaidCheckoutSession,
} from '../_shared/omie/parcelas-builder.ts'
import {
  ensureOmieProjetoForCelebridade,
  OmieProjetoEnsureError,
} from '../_shared/omie/projeto-celebridade.ts'
import { resolveNumeroProposta } from '../_shared/omie/proposta-number.ts'
import { resolveMunicipioIbge } from '../_shared/omie/municipio-ibge.ts'
import { resolveVendedorOmieCodigo } from '../_shared/omie/vendedor-mapping.ts'
import {
  emitOperationalEventEnriched,
  OPERATIONAL_EVENT_TYPES,
  type OperationalLabelOverrides,
} from '../_shared/operational-events.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-turnstile-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Mapeia labels de forma de pagamento para codigos OMIE (cCodParc, max 3 chars)
// Referencia: OMIE API condição de pagamento
// "000" = A vista | "001" = 30 dias | "002" = 30/60 dias | "999" = A consultar
const PAYMENT_METHOD_MAP: Record<string, string> = {
  // Cartão
  'cartao de credito': '000',
  'cartão de crédito': '000',
  'cartao de debito': '000',
  'cartão de débito': '000',
  'credit_card': '000',
  'debit_card': '000',
  'credit': '000',
  'debit': '000',
  // PIX
  'pix': '000',
  // Boleto
  'boleto': '001',
  'boleto bancario': '001',
  'boleto bancário': '001',
  // A vista
  'a vista': '000',
  'à vista': '000',
  // Fallback generico
  'outros': '999',
}
const PAID_PAYMENT_STATUS_VALUES = [1, 2] as const
const isLikelyJwt = (token: string): boolean => {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

const resolveOmieCodParc = (
  formaPagamento: string,
  parcelas: number,
  checkoutMetodoPagamento?: string | null
): string => {
  if (checkoutMetodoPagamento) {
    const metodoNorm = checkoutMetodoPagamento
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const metodoExact = PAYMENT_METHOD_MAP[metodoNorm]
    if (metodoExact !== undefined) {
      if (parcelas > 1 && /cart[aã]o.*cr[eé]dito|credit/i.test(checkoutMetodoPagamento)) {
        return '999'
      }
      return metodoExact
    }
    for (const [key, code] of Object.entries(PAYMENT_METHOD_MAP)) {
      if (metodoNorm.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        if (parcelas > 1 && /cart[aã]o.*cr[eé]dito|credit/i.test(checkoutMetodoPagamento)) {
          return '999'
        }
        return code
      }
    }
  }

  if (/^\d{1,3}$/.test(formaPagamento.trim())) {
    return formaPagamento.trim()
  }

  const normalized = formaPagamento.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const exactMatch = PAYMENT_METHOD_MAP[normalized]
  if (exactMatch) {
    if (parcelas > 1 && /cart[aã]o.*cr[eé]dito|credit/i.test(formaPagamento)) {
      return '999'
    }
    return exactMatch
  }

  for (const [key, code] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (normalized.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
      if (parcelas > 1 && /cart[aã]o.*cr[eé]dito|credit/i.test(formaPagamento)) {
        return '999'
      }
      return code
    }
  }

  return '000'
}

type OrchestratorRequest = {
  compra_id: string
  nota_fiscal_id?: string
  force?: boolean
  backfill_payload_only?: boolean
}

type OmieSyncStatus = 'pending' | 'processing' | 'synced' | 'failed'

const extractPayload = (body: Record<string, unknown>) => {
  if (body.record && typeof body.record === 'object') {
    return body.record as Record<string, unknown>
  }
  if (body.payload && typeof body.payload === 'object') {
    return body.payload as Record<string, unknown>
  }
  return body
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

const formatDate = (value?: string | null) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const DEFAULT_DESCRICAO_SERVICO_TEMPLATE =
  'Proposta n. {{numero_proposta}}\nDireito de uso: {{celebridade}} - {{cliente_nome}} - {{cidade}} - {{uf}} - {{vigencia}}\nSegmento: {{segmento}} - Subsegmento: {{subsegmento}} - Negocio: {{negocio}}\nPagamento(s): {{pagamentos}}'

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 's', 'sim', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'n', 'nao', 'não', 'no'].includes(normalized)) return false
  }
  return fallback
}

const normalizeEtapa = (value: unknown, fallback = '50'): string => {
  const parsed = typeof value === 'string' ? value.trim() : ''
  return /^\d{2}$/.test(parsed) ? parsed : fallback
}

const normalizeDepartamentoPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const parseDepartamentosCodigos = (value: unknown): string[] => {
  if (typeof value !== 'string') return []
  const seen = new Set<string>()
  const codes: string[] = []

  for (const part of value.split(',')) {
    const code = part.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    codes.push(code)
  }

  return codes
}

const renderTemplate = (
  template: string,
  context: Record<string, string | number | null | undefined>
): string =>
  template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key: string) => {
    const raw = context[key]
    if (raw === null || raw === undefined) return ''
    return String(raw)
  })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DEFAULT_STATUS_POLL_DELAYS_MS = [3000, 7000, 12000, 20000]
const DEFAULT_STATUS_POLL_ATTEMPT_TIMEOUT_MS = 6000

const readPositiveIntEnv = (envName: string, defaultValue: number): number => {
  const raw = Deno.env.get(envName)
  if (!raw) return defaultValue
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) return defaultValue
  return parsed
}

const parsePollDelaysMs = (raw: string | undefined): number[] => {
  if (!raw || raw.trim() === '') return DEFAULT_STATUS_POLL_DELAYS_MS
  const parsed = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0 && Number.isInteger(v))
  if (parsed.length === 0) return DEFAULT_STATUS_POLL_DELAYS_MS
  return parsed
}

const postOmieWithTimeout = async (
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<Record<string, unknown>> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    return (await res.json()) as Record<string, unknown>
  } finally {
    clearTimeout(timeoutId)
  }
}

const parseDDMMYYYY = (value: string): string => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`
}

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function notifyOmieIntegrationFailed(
  supabase: SupabaseClient,
  compraId: string,
  metadata: Record<string, unknown>,
  labelOverrides?: OperationalLabelOverrides
) {
  emitOperationalEventEnriched(supabase, {
    event_type: OPERATIONAL_EVENT_TYPES.OMIE_INTEGRATION_FAILED,
    compra_id: compraId,
    source: 'omie-orchestrator',
    metadata,
    ...(labelOverrides && { label_overrides: labelOverrides }),
  })
}

const extractNumericField = (data: Record<string, unknown> | null, keys: string[]) => {
  if (!data) return undefined
  for (const key of keys) {
    const value = data[key]
    const parsed = toNumber(value)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

const extractStringField = (data: Record<string, unknown> | null, keys: string[]) => {
  if (!data) return undefined
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

const resolveOsIdFromEdgePayload = (payload: Record<string, unknown> | null): number | undefined => {
  if (!payload) return undefined

  const nestedData = payload.data
  if (nestedData && typeof nestedData === 'object') {
    const parsed = extractNumericField(nestedData as Record<string, unknown>, ['nCodOS', 'nCodOs', 'codigo_os'])
    if (parsed !== undefined) return parsed
  }

  const nestedError = payload.error
  if (nestedError && typeof nestedError === 'object') {
    const errorObj = nestedError as Record<string, unknown>
    const details = errorObj.details
    if (details && typeof details === 'object') {
      const parsedFromDetails = extractNumericField(details as Record<string, unknown>, ['nCodOS', 'nCodOs', 'codigo_os'])
      if (parsedFromDetails !== undefined) return parsedFromDetails
    }
  }

  return undefined
}

const callEdge = async <T extends Record<string, unknown>>(
  baseUrl: string,
  serviceRoleKey: string,
  path: string,
  body: Record<string, unknown>
) => {
  const response = await fetch(`${baseUrl}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  })

  let responseBody: Record<string, unknown> | null = null
  try {
    responseBody = (await response.json()) as Record<string, unknown>
  } catch {
    responseBody = null
  }

  if (!response.ok || responseBody?.error) {
    const errorObj = responseBody?.error as Record<string, unknown> | undefined
    const message = errorObj?.message ?? response.statusText ?? 'Erro ao chamar Edge'
    const fields = errorObj?.fields ?? null
    const details = errorObj?.details ?? null
    return { ok: false, status: response.status, error: message, fields, details, data: responseBody as T | null }
  }

  return { ok: true, status: response.status, data: responseBody as T }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' })
  }

  // Autorizacao interna (esta funcao deve ser deployada com verify_jwt=false)
  // Para evitar exposicao publica, exigimos um Bearer token igual ao Service Role.
  const authHeader = req.headers.get('authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const crmServiceRoleKey = Deno.env.get('CRM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const crmSecretKey = Deno.env.get('CRM_SUPABASE_SECRET_KEY') ?? ''

  const expected = [serviceRoleKey, crmServiceRoleKey, crmSecretKey]
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
    .map((key) => `Bearer ${key}`)
  const authMatched = Boolean(authHeader && expected.includes(authHeader))

  if (!expected.length) {
    return jsonResponse(500, {
      code: 'CONFIG_ERROR',
      message: 'Nenhuma chave de autorizacao configurada (service role ausente)',
    })
  }

  if (!authMatched) {
    return jsonResponse(401, {
      code: 'UNAUTHORIZED',
      message: 'Authorization invalida',
    })
  }

  const authToken = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? ''
  const downstreamJwtToken = [
    authToken,
    serviceRoleKey.trim(),
    crmServiceRoleKey.trim(),
    crmSecretKey.trim(),
  ].find((token) => token.length > 0 && isLikelyJwt(token))

  if (!downstreamJwtToken) {
    return jsonResponse(500, {
      code: 'DOWNSTREAM_AUTH_INVALID',
      message: 'Nenhuma credencial JWT valida configurada para chamadas internas de Edge Function',
    })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return jsonResponse(400, { code: 'INVALID_JSON', message: 'JSON invalido' })
  }

  const payload = extractPayload(body)
  const compraId = payload.compra_id
  const notaFiscalId = payload.nota_fiscal_id
  const force = Boolean(payload.force)
  const backfillPayloadOnly = Boolean(payload.backfill_payload_only)
  const correlationId = req.headers.get('x-correlation-id')?.trim() || crypto.randomUUID()

  if (typeof compraId !== 'string' || !UUID_REGEX.test(compraId)) {
    return jsonResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'compra_id e obrigatorio e deve ser UUID',
    })
  }

  if (notaFiscalId && (typeof notaFiscalId !== 'string' || !UUID_REGEX.test(notaFiscalId))) {
    return jsonResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'nota_fiscal_id deve ser UUID',
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = serviceRoleKey || crmServiceRoleKey || crmSecretKey

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse(500, {
      code: 'CONFIG_ERROR',
      message: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  })

  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .select(
      'id, cliente_id, valor_total, tempoocomprado, segmento, subsegmento, celebridade, forma_pagamento, mgs_condicao_pagamento, checkout_metodo_pagamento, data_compra, numero_parcelas, vendedoresponsavel, imagemproposta_id, regiaocomprada, leadid, tipo_venda'
    )
    .eq('id', compraId)
    .single()

  if (compraError || !compra) {
    return jsonResponse(404, { code: 'COMPRA_NOT_FOUND', message: 'Compra nao encontrada' })
  }

  if (!compra.cliente_id) {
    return jsonResponse(404, { code: 'CLIENTE_NOT_FOUND', message: 'Cliente nao encontrado' })
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select(
      'id, nome, nome_fantasia, razaosocial, email, cpf, cnpj, cidade, estado, logradouro, numero, complemento, bairro, cep, endereco_completo'
    )
    .eq('id', compra.cliente_id)
    .single()

  if (clienteError || !cliente) {
    return jsonResponse(404, { code: 'CLIENTE_NOT_FOUND', message: 'Cliente nao encontrado' })
  }

  // Buscar checkout_sessions para dados de pagamento (PaymentId, Nsu, metodo, data de pagamento)
  const { data: checkoutSession, error: checkoutSessionError } = await supabase
    .from('checkout_sessions')
    .select('payment_id, payment_response, metodo_pagamento, parcelas, completed_at, updated_at, cliente_endereco, cliente_numero, cliente_bairro, cliente_cep, cliente_cidade, cliente_uf')
    .eq('compra_id', compraId)
    .in('payment_status', [...PAID_PAYMENT_STATUS_VALUES])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (checkoutSessionError) {
    return jsonResponse(500, {
      code: 'CHECKOUT_SESSION_QUERY_FAILED',
      message: 'Falha ao consultar checkout_sessions para dados de pagamento',
      details: { reason: checkoutSessionError.message },
    })
  }

  const paymentResponse = checkoutSession?.payment_response as Record<string, unknown> | null
  const paymentPayload = (paymentResponse?.Payment ?? paymentResponse) as Record<string, unknown> | undefined
  const gatewayPaymentId = checkoutSession?.payment_id ?? (paymentPayload?.PaymentId ? String(paymentPayload.PaymentId) : null)
  const gatewayNsu = paymentPayload?.Nsu ? String(paymentPayload.Nsu)
    : paymentPayload?.ProofOfSale ? String(paymentPayload.ProofOfSale)
    : null
  const checkoutMetodoPagamento = checkoutSession?.metodo_pagamento ?? null
  const observacoes = buildObservacoesFromPayment(checkoutMetodoPagamento, paymentPayload)
  const dataPagamentoConfirmado =
    checkoutSession?.completed_at ?? checkoutSession?.updated_at ?? null

  const { data: allPaidSessions } = await supabase
    .from('checkout_sessions')
    .select(PARCELAS_SESSION_COLUMNS)
    .eq('compra_id', compraId)
    .in('payment_status', [...PAID_PAYMENT_STATUS_VALUES])

  console.log(
    JSON.stringify({
      event: 'omie_debug_payment_context',
      compra_id: compraId,
      checkout_session_found: Boolean(checkoutSession),
      payment_status_filter: [...PAID_PAYMENT_STATUS_VALUES],
      metodo_pagamento: checkoutMetodoPagamento ?? null,
      has_payment_payload: Boolean(paymentPayload),
      has_observacoes: Boolean(observacoes),
    })
  )

  // Detectar split_type para resolver valor correto (boleto_parcelado usa compra.valor_total)
  let splitType: string | null = null
  const firstSessionWithGroup = allPaidSessions?.find((s) => s.split_group_id)
  if (firstSessionWithGroup?.split_group_id) {
    const { data: splitGroup } = await supabase
      .from('checkout_split_groups')
      .select('split_type')
      .eq('id', firstSessionWithGroup.split_group_id)
      .maybeSingle()
    splitType = splitGroup?.split_type ?? null
  }

  // Buscar vendedor + agencia
  let vendedorNome: string | null = null
  let vendedorOmieCodigo: number | null = null
  let agenciaNome: string | null = null
  let omieProjetoId: number | null = null

  if (compra.vendedoresponsavel) {
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome, omie_usuario_codigo, omie_ativo')
      .eq('id', compra.vendedoresponsavel)
      .maybeSingle()

    if (vendedorError) {
      const errMsg = `Falha ao consultar vendedor responsavel: ${vendedorError.message}`
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'VENDEDOR_QUERY_ERROR',
        last_error: errMsg,
      })
      return jsonResponse(500, {
        code: 'VENDEDOR_QUERY_ERROR',
        message: 'Falha ao consultar vendedor responsavel',
        details: { reason: vendedorError.message },
      })
    }

    if (vendedor) {
      vendedorNome = vendedor.nome ?? null
      const vendedorResolution = resolveVendedorOmieCodigo({
        omie_ativo: vendedor.omie_ativo as boolean | null | undefined,
        omie_usuario_codigo: vendedor.omie_usuario_codigo,
      })
      vendedorOmieCodigo = vendedorResolution.codigo
      if (vendedorResolution.motivo !== 'ok') {
        console.warn(
          `[OMIE_VENDEDOR] compra_id=${compraId} vendedor_id=${vendedor.id ?? 'n/a'} motivo=${vendedorResolution.motivo}`
        )
      }
    } else {
      console.warn(
        `[OMIE_VENDEDOR] compra_id=${compraId} vendedor_id=${String(compra.vendedoresponsavel)} motivo=vendedor_nao_encontrado`
      )
    }
  }

  // Resolver agencia via lead
  if (compra.leadid) {
    const { data: lead } = await supabase
      .from('leads')
      .select('av:agenciavendas(nome), ag:agencia(nome), agenciatext')
      .eq('lead_id', compra.leadid)
      .maybeSingle()

    if (lead) {
      const avNome = (lead.av as { nome?: string } | null)?.nome
      const agNome = (lead.ag as { nome?: string } | null)?.nome
      const fallbackNome = (lead.agenciatext as string | null | undefined)
      agenciaNome = avNome?.trim() || agNome?.trim() || fallbackNome?.trim() || null
    }
  }

  let notaFiscal =
    notaFiscalId
      ? (
          await supabase
            .from('notas_fiscais')
            .select('id, compra_id, cliente_id, status, numero, data_emissao, omie_os_id')
            .eq('id', notaFiscalId)
            .single()
        ).data
      : null

  if (!notaFiscal) {
    const { data: notas } = await supabase
      .from('notas_fiscais')
      .select('id, compra_id, cliente_id, status, numero, data_emissao, omie_os_id')
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })
      .limit(1)

    notaFiscal = notas?.[0] ?? null
  }

  const { data: omieSync } = await supabase
    .from('omie_sync')
    .select('*')
    .eq('compra_id', compraId)
    .maybeSingle()

  if (omieSync?.omie_status === 'synced' && !force) {
    return jsonResponse(409, {
      code: 'OMIE_ALREADY_SYNCED',
      message: 'OMIE ja sincronizado para esta compra',
    })
  }

  const attempts = (omieSync?.attempts ?? 0) + 1

  if (omieSync?.id) {
    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'processing',
        attempts,
        last_error: null,
        nota_fiscal_id: notaFiscal?.id ?? null,
        nf_numero: notaFiscal?.numero ?? null,
        cliente_id: cliente.id,
        omie_cliente_payload: null,
        omie_servico_payload: null,
        omie_os_payload: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', omieSync.id)
  } else {
    await supabase.from('omie_sync').insert({
      compra_id: compraId,
      cliente_id: cliente.id,
      nota_fiscal_id: notaFiscal?.id ?? null,
      nf_numero: notaFiscal?.numero ?? null,
      omie_status: 'processing',
      attempts,
      omie_cliente_payload: null,
      omie_servico_payload: null,
      omie_os_payload: null,
    })
  }

  const { data: nfseConfig, error: nfseConfigError } = await supabase
    .from('omie_nfse_config')
    .select('*')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (nfseConfigError || !nfseConfig) {
    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'failed' satisfies OmieSyncStatus,
        last_error: 'omie_nfse_config ativo nao encontrado',
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)
    notifyOmieIntegrationFailed(supabase, compraId, {
      code: 'NFSE_CONFIG_NOT_FOUND',
      last_error: 'omie_nfse_config ativo nao encontrado',
    })
    return jsonResponse(500, {
      code: 'NFSE_CONFIG_NOT_FOUND',
      message: 'Configuracao omie_nfse_config ativa nao encontrada',
    })
  }

  const compraImagempropostaId = String(compra.imagemproposta_id ?? '').trim()
  if (!compraImagempropostaId) {
    const errMsg =
      'Numero da proposta ausente: compras.imagemproposta_id e obrigatorio para criar/atualizar OS'
    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'failed' satisfies OmieSyncStatus,
        last_error: errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)
    notifyOmieIntegrationFailed(supabase, compraId, {
      code: 'PROPOSTA_NUMERO_MISSING',
      last_error: errMsg,
    })
    return jsonResponse(400, {
      code: 'PROPOSTA_NUMERO_MISSING',
      message: errMsg,
    })
  }

  const { data: imagemProposta } = await supabase
    .from('imagemProposta')
    .select('id')
    .eq('idproposta', compraImagempropostaId)
    .limit(1)
    .maybeSingle()

  let skipOsCreation = false
  const notaFiscalOsId = notaFiscal?.omie_os_id && String(notaFiscal.omie_os_id).trim() !== ''
    ? String(notaFiscal.omie_os_id)
    : null
  const omieSyncOsId = omieSync?.omie_os_id && String(omieSync.omie_os_id).trim() !== ''
    ? String(omieSync.omie_os_id)
    : null
  let existingOsId: string | number | null = notaFiscalOsId ?? omieSyncOsId ?? null
  if (force && existingOsId) {
    skipOsCreation = true
  }
  if (backfillPayloadOnly) {
    skipOsCreation = true
  }

  const celebridadeName = async () => {
    if (!compra.celebridade) return null
    const { data: ref } = await supabase
      .from('celebridadesReferencia')
      .select('nome, nomeJuridico')
      .eq('id', compra.celebridade)
      .maybeSingle()
    if (ref?.nome) return ref.nome
    if (ref?.nomeJuridico) return ref.nomeJuridico

    const { data: sgc } = await supabase
      .from('sgc_celebridades')
      .select('name')
      .eq('uuid', compra.celebridade)
      .maybeSingle()
    if (sgc?.name) return sgc.name
    return null
  }

  const segmentoName = async () => {
    if (!compra.segmento) return null
    const { data } = await supabase
      .from('segmentos')
      .select('nome')
      .eq('id', compra.segmento)
      .maybeSingle()
    return data?.nome ?? null
  }

  const subsegmentoName = async () => {
    if (!compra.subsegmento) return null
    const { data } = await supabase
      .from('subsegmento')
      .select('nome')
      .eq('id', compra.subsegmento)
      .maybeSingle()
    return data?.nome ?? null
  }

  const [celebridade, segmento, subsegmento] = await Promise.all([
    celebridadeName(),
    segmentoName(),
    subsegmentoName(),
  ])

  const omieOperationalLabels = (): OperationalLabelOverrides => ({
    vendedor_nome: vendedorNome ?? '',
    celebridade_nome: celebridade ?? '',
  })

  const isUpsell = compra.tipo_venda === 'Upsell'

  const missingFields: string[] = []
  if (!isUpsell && !celebridade) missingFields.push('celebridade')
  if (!cliente.estado) missingFields.push('cliente.estado')
  if (!compra.regiaocomprada) missingFields.push('regiaocomprada')
  if (!isUpsell && !segmento) missingFields.push('segmento')
  if (!isUpsell && !subsegmento) missingFields.push('subsegmento')
  if (!compra.tempoocomprado) missingFields.push('tempoocomprado')

  const valorTotalCentavosFromCompra = parseReaisToCentavos(compra.valor_total)
  const valorTotalCentavos = resolveValorTotalCentavosForSplit(
    compra.valor_total,
    (allPaidSessions ?? []).map((session) => ({
      valor_centavos:
        typeof session.valor_centavos === 'number' ? session.valor_centavos : null,
    })),
    splitType
  )
  if (
    splitType !== 'boleto_parcelado' &&
    valorTotalCentavosFromCompra &&
    valorTotalCentavos &&
    valorTotalCentavosFromCompra !== valorTotalCentavos
  ) {
    console.warn(
      `[OMIE_VALOR] compra_id=${compraId} divergencia valor_total compra=${valorTotalCentavosFromCompra} centavos vs checkout=${valorTotalCentavos} centavos; usando checkout_sessions`
    )
  }
  if (!valorTotalCentavos || valorTotalCentavos <= 0) missingFields.push('valor_total')

  const formaPagamento =
    compra.mgs_condicao_pagamento ??
    compra.forma_pagamento ??
    compra.checkout_metodo_pagamento

  if (!formaPagamento) missingFields.push('forma_pagamento')
  if (!compra.vendedoresponsavel) missingFields.push('vendedoresponsavel')
  if (!vendedorOmieCodigo || vendedorOmieCodigo <= 0) {
    missingFields.push('vendedor_omie_codigo')
  }

  if (missingFields.length > 0) {
    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'failed' satisfies OmieSyncStatus,
        last_error: `Campos ausentes: ${missingFields.join(', ')}`,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)
    notifyOmieIntegrationFailed(supabase, compraId, {
      code: 'VALIDATION_ERROR',
      last_error: `Campos ausentes: ${missingFields.join(', ')}`,
      fields: missingFields,
    }, omieOperationalLabels())
    return jsonResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'Dados insuficientes para OMIE',
      fields: missingFields,
    })
  }

  if (!isUpsell || compra.celebridade) {
    try {
      const projetoResolution = await ensureOmieProjetoForCelebridade({
        supabase,
        celebridadeId: String(compra.celebridade),
        celebridadeNome: celebridade!,
        mode: 'apply',
        correlationId,
      })
      omieProjetoId = projetoResolution.nCodProj
      if (projetoResolution.warning) {
        console.warn(`[OMIE_PROJETO] compra_id=${compraId} ${projetoResolution.warning}`)
      }
    } catch (error) {
      const message =
        error instanceof OmieProjetoEnsureError ? error.message : `Erro inesperado: ${String(error)}`
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: `OMIE_PROJETO_SYNC_FAILED: ${message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_PROJETO_SYNC_FAILED',
        last_error: `OMIE_PROJETO_SYNC_FAILED: ${message}`,
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_PROJETO_SYNC_FAILED',
        message: 'Falha ao garantir projeto OMIE da celebridade',
        details:
          error instanceof OmieProjetoEnsureError
            ? { reason: error.message, error_code: error.code, extra: error.details ?? null }
            : { reason: String(error) },
      })
    }
  } else {
    console.log(`[OMIE_PROJETO] compra_id=${compraId} Upsell sem celebridade — pulando projeto OMIE`)
  }

  const valorTotalSafe = centavosToReais(valorTotalCentavos ?? 0)

  let cidadePrestacaoServico: string = compra.regiaocomprada
  if (compra.regiaocomprada && cliente.estado) {
    const municipioResult = await resolveMunicipioIbge({
      supabase,
      cidade: compra.regiaocomprada,
      estado: cliente.estado,
      correlationId: compraId,
    })
    if (municipioResult.ok) {
      cidadePrestacaoServico = `${municipioResult.cidadeNome} (${municipioResult.uf})`
    } else {
      console.warn(
        `[OMIE_CIDADE_RESOLVE_FAIL] compra_id=${compraId} cidade=${compra.regiaocomprada} estado=${cliente.estado} code=${municipioResult.code} — usando regiaocomprada como fallback`
      )
    }
  }

  let clienteId: number | undefined
  let serviceId: number | undefined
  let osId: string | number | null = null
  let clientePayloadForSync: Record<string, unknown> | null = null
  let servicePayloadForSync: Record<string, unknown> | null = null
  let osPayloadForSync: Record<string, unknown> | null = null

  const clientePayload = {
    cliente: {
      codigo_cliente_integracao: cliente.id,
      razao_social: cliente.razaosocial ?? cliente.nome,
      nome_fantasia: cliente.nome_fantasia ?? cliente.nome,
      cnpj_cpf: cliente.cnpj ?? cliente.cpf,
      email: cliente.email ?? undefined,
      endereco:
        cliente.logradouro ??
        checkoutSession?.cliente_endereco ??
        cliente.endereco_completo ??
        undefined,
      endereco_numero: cliente.numero ?? checkoutSession?.cliente_numero ?? undefined,
      bairro: cliente.bairro ?? checkoutSession?.cliente_bairro ?? undefined,
      complemento: cliente.complemento ?? undefined,
      cidade: cliente.cidade ?? checkoutSession?.cliente_cidade ?? undefined,
      estado: cliente.estado ?? checkoutSession?.cliente_uf ?? undefined,
      cep: cliente.cep ?? checkoutSession?.cliente_cep ?? undefined,
      codigo_pais: '1058',
    },
  }
  clientePayloadForSync = clientePayload
  await supabase
    .from('omie_sync')
    .update({
      omie_cliente_payload: clientePayloadForSync,
      updated_at: new Date().toISOString(),
    })
    .eq('compra_id', compraId)

  const servicePayload = {
    service: {
      celebridade: celebridade!,
      uf: cliente.estado,
      cidade: cliente.cidade,
      segmento: segmento!,
      subsegmento: subsegmento!,
      vigencia: compra.tempoocomprado,
      valor: valorTotalCentavos,
      aliquota_iss: nfseConfig.aliquota_iss,
      retencao_iss: nfseConfig.retencao_iss,
      aliquota_ir: nfseConfig.aliquota_ir,
      retencao_ir: nfseConfig.retencao_ir,
      aliquota_inss: nfseConfig.aliquota_inss,
      retencao_inss: nfseConfig.retencao_inss,
      aliquota_pis: nfseConfig.aliquota_pis,
      retencao_pis: nfseConfig.retencao_pis,
      aliquota_cofins: nfseConfig.aliquota_cofins,
      retencao_cofins: nfseConfig.retencao_cofins,
      aliquota_csll: nfseConfig.aliquota_csll,
      retencao_csll: nfseConfig.retencao_csll,
    },
  }
  servicePayloadForSync = servicePayload
  await supabase
    .from('omie_sync')
    .update({
      omie_servico_payload: servicePayloadForSync,
      updated_at: new Date().toISOString(),
    })
    .eq('compra_id', compraId)

  if (!skipOsCreation) {
    const clienteResponse = await callEdge<{ data?: Record<string, unknown> }>(
      supabaseUrl,
      downstreamJwtToken,
      'omie-create-client',
      clientePayload
    )

    if (!clienteResponse.ok) {
      const errMsg = `omie-create-client: ${clienteResponse.error}`
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_EDGE_ERROR',
        step: 'omie-create-client',
        last_error: errMsg,
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_EDGE_ERROR',
        message: errMsg,
        step: 'omie-create-client',
        fields: clienteResponse.fields,
        sent_payload: clientePayload,
        edge_response: clienteResponse.data,
      })
    }

    clienteId = extractNumericField(clienteResponse.data?.data ?? null, [
      'codigo_cliente_omie',
      'codigo_cliente',
      'nCodCli',
    ])

    if (!clienteId) {
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: 'omie-create-client: ID OMIE nao retornado',
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_EDGE_ERROR',
        step: 'omie-create-client',
        last_error: 'omie-create-client: ID OMIE nao retornado',
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_EDGE_ERROR',
        message: 'omie-create-client nao retornou codigo do cliente',
      })
    }

    // Best-effort: vincular tag de agência no cliente OMIE
    if (agenciaNome && clienteId) {
      try {
        await postOmieWithTimeout(
          `${omieBaseUrl}/geral/clientetag/`,
          {
            call: 'IncluirTags',
            app_key: omieAppKey,
            app_secret: omieAppSecret,
            param: [{ nCodCliente: clienteId, tags: [{ tag: agenciaNome }] }],
          },
          10000
        )
        console.info(
          `[OMIE_TAG] compra_id=${compraId} agencia="${agenciaNome}" tag vinculada ao cliente nCodCliente=${clienteId}`
        )
      } catch (err) {
        console.warn(
          `[OMIE_TAG] compra_id=${compraId} falha ao vincular tag agencia (best-effort):`,
          err
        )
      }
    }

    const serviceResponse = await callEdge<{ data?: Record<string, unknown> }>(
      supabaseUrl,
      downstreamJwtToken,
      'omie-create-service',
      servicePayload
    )

    if (!serviceResponse.ok) {
      const errMsg = `omie-create-service: ${serviceResponse.error}`
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_EDGE_ERROR',
        step: 'omie-create-service',
        last_error: errMsg,
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_EDGE_ERROR',
        message: errMsg,
        step: 'omie-create-service',
        fields: serviceResponse.fields,
        sent_payload: servicePayload,
        edge_response: serviceResponse.data,
      })
    }

    serviceId = extractNumericField(serviceResponse.data?.data ?? null, [
      'nCodServ',
      'nCodServico',
      'cCodServ',
    ])

    if (!serviceId) {
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: 'omie-create-service: ID OMIE do servico nao retornado',
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_EDGE_ERROR',
        step: 'omie-create-service',
        last_error: 'omie-create-service: ID OMIE do servico nao retornado',
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_EDGE_ERROR',
        message: 'omie-create-service nao retornou codigo do servico',
      })
    }

    // Para boleto_parcelado: só 1 sessão paga das N totais — usar legacy path com
    // numero_parcelas do contrato para refletir o schedule completo.
    const parcelasResult = splitType === 'boleto_parcelado'
      ? null
      : buildParcelasFromSessions(
          (allPaidSessions ?? []) as PaidCheckoutSession[],
          valorTotalCentavos
        )
    const numParcelas = parcelasResult?.nQtdeParc ?? compra.numero_parcelas ?? 1
    const codParc = parcelasResult
      ? parcelasResult.cCodParc
      : resolveOmieCodParc(String(formaPagamento), numParcelas, checkoutMetodoPagamento)
    // Fiscal-only: OMIE never generates/sends payment documents
    const envFlags = { enviarBoleto: false as const, enviarPix: false as const }
    const numeroPropostaResolution = resolveNumeroProposta({
      compraImagempropostaId,
      imagemPropostaPk: toNumber(imagemProposta?.id),
    })
    if (numeroPropostaResolution.warning) {
      console.warn(`[OMIE_PROPOSTA] compra_id=${compraId} ${numeroPropostaResolution.warning}`)
    }
    const numeroProposta = numeroPropostaResolution.numeroProposta
    const descricaoTemplate =
      typeof nfseConfig.descricao_servico_template === 'string' &&
      nfseConfig.descricao_servico_template.trim() !== ''
        ? nfseConfig.descricao_servico_template
        : DEFAULT_DESCRICAO_SERVICO_TEMPLATE
    const clienteNome =
      cliente.nome_fantasia ??
      cliente.razaosocial ??
      cliente.nome ??
      'Cliente'
    const pagamentosLabel = buildPagamentosLabel(
      allPaidSessions ?? [],
      String(formaPagamento),
      numParcelas
    )
    const descricaoServicoFormatada = normalizeDescricaoServico(renderTemplate(descricaoTemplate, {
      numero_proposta: numeroProposta,
      celebridade: celebridade ?? '',
      cliente_nome: clienteNome,
      cidade: compra.regiaocomprada ?? '',
      uf: cliente.estado ?? '',
      vigencia: compra.tempoocomprado ?? '',
      segmento: segmento ?? '',
      subsegmento: subsegmento ?? '',
      negocio: subsegmento ?? '',
      pagamentos: pagamentosLabel,
    }).trim())
    const osEtapa = normalizeEtapa(nfseConfig.os_etapa, '50')
    const enviarLinkNfse = false
    const enviarBoleto = false
    const enviarPix = false
    const departamentoPayload = normalizeDepartamentoPayload(nfseConfig.departamento_payload)
    const departamentosCodigos = parseDepartamentosCodigos(
      nfseConfig.departamentos_codigos
    )

    const osPayload = buildCanonicalOsPayload({
      compraId: compra.id,
      clienteOmieId: clienteId,
      email: cliente.email,
      cidadePrestacaoServico,
      codParc,
      osEtapa,
      quantidadeParcelas: numParcelas,
      dataVenda: formatDate(dataPagamentoConfirmado ?? compra.data_compra),
      enviarLinkNfse,
      enviarBoleto,
      enviarPix,
      departamentosCodigos,
      departamentoPayload,
      numeroProposta,
      descricaoServico: descricaoServicoFormatada || `Servico ${celebridade || 'Upsell'}`,
      serviceId,
      codigoServicoMunicipal: nfseConfig.codigo_servico_municipal,
      codigoLc116: nfseConfig.codigo_lc116,
      tipoTributacao: nfseConfig.tipo_tributacao,
      retencaoIss: nfseConfig.retencao_iss,
      aliquotaIss: nfseConfig.aliquota_iss,
      nfNumero: notaFiscal?.numero ?? undefined,
      vendedorNome: vendedorNome ?? undefined,
      vendedorOmieCodigo: vendedorOmieCodigo ?? undefined,
      agenciaNome: agenciaNome ?? undefined,
      nCodProj: omieProjetoId ?? undefined,
      codigoCategoria: nfseConfig.codigo_categoria ?? undefined,
      contaCorrenteId: nfseConfig.conta_corrente_id ?? undefined,
      metodoPagamento: checkoutMetodoPagamento ?? undefined,
      paymentId: gatewayPaymentId ?? undefined,
      nsu: gatewayNsu ?? undefined,
      observacoes,
      tipoVenda: compra.tipo_venda ?? undefined,
      valorTotal: valorTotalSafe,
      parcelasExplicitas: parcelasResult?.parcelas,
      dataCompetencia: formatDate(dataPagamentoConfirmado ?? compra.data_compra),
    })
    osPayloadForSync = osPayload as Record<string, unknown>
    await supabase
      .from('omie_sync')
      .update({
        omie_os_payload: osPayloadForSync,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)

    const osResponse = await callEdge<{ data?: Record<string, unknown> }>(
      supabaseUrl,
      downstreamJwtToken,
      'omie-create-os',
      osPayload
    )

    if (!osResponse.ok) {
      const edgePayload = osResponse.data as Record<string, unknown> | null
      const edgeError = (edgePayload?.error as Record<string, unknown> | undefined) ?? null
      const edgeErrorCode = typeof edgeError?.code === 'string' ? edgeError.code : null
      const errorMessage = `${String(osResponse.error ?? '')} ${typeof edgeError?.message === 'string' ? edgeError.message : ''}`.toLowerCase()
      const duplicateDetected =
        edgeErrorCode === 'OMIE_DUPLICATE' ||
        errorMessage.includes('duplic') ||
        errorMessage.includes('ja cadastrad') ||
        errorMessage.includes('já cadastrad')
      const duplicateResolvedOsId =
        resolveOsIdFromEdgePayload(edgePayload) ??
        (existingOsId ? toNumber(existingOsId) : undefined)

      if (duplicateDetected && duplicateResolvedOsId && duplicateResolvedOsId > 0) {
        osId = duplicateResolvedOsId
      } else {
      const errMsg = `omie-create-os: ${osResponse.error}`
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_EDGE_ERROR',
        step: 'omie-create-os',
        last_error: errMsg,
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_EDGE_ERROR',
        message: errMsg,
        step: 'omie-create-os',
        fields: osResponse.fields,
        sent_payload: osPayload,
        edge_response: osResponse.data,
      })
      }
    }

    if (osId == null) {
      osId =
        extractNumericField(osResponse.data?.data ?? null, ['nCodOS', 'nCodOs', 'codigo_os']) ??
        extractStringField(osResponse.data?.data ?? null, ['cNumOS', 'numero_os']) ??
        null
    }

    if (osId == null || Number.isNaN(Number(osId)) || Number(osId) === 0) {
      await supabase
        .from('omie_sync')
        .update({
          omie_status: 'failed' satisfies OmieSyncStatus,
          last_error: 'omie-create-os: osId ausente ou inválido',
          updated_at: new Date().toISOString(),
        })
        .eq('compra_id', compraId)
      if (notaFiscal?.id) {
        await supabase
          .from('notas_fiscais')
          .update({
            status: 'Error',
            erro_mensagem: 'OS criada sem ID válido retornado pela OMIE',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notaFiscal.id)
      }
      notifyOmieIntegrationFailed(supabase, compraId, {
        code: 'OMIE_OS_ID_MISSING',
        last_error: 'omie-create-os: osId ausente ou inválido',
      }, omieOperationalLabels())
      return jsonResponse(502, {
        code: 'OMIE_OS_ID_MISSING',
        message: 'omie-create-os retornou sem osId válido (nCodOS/cNumOS ausente ou zero)',
      })
    }

    // Step 9 — Upsert notas_fiscais after OS creation (by compra_id, skip Cancelled)
    const nfFields = {
      compra_id: compraId,
      cliente_id: compra.cliente_id,
      status: 'Processing',
      codigo_servico: nfseConfig.codigo_servico_municipal,
      valor_servicos: valorTotalSafe,
      emissor: 'omie',
      omie_os_id: osId ? String(osId) : null,
      updated_at: new Date().toISOString(),
    }

    const { data: existingNf } = await supabase
      .from('notas_fiscais')
      .select('id')
      .eq('compra_id', compraId)
      .or('status.is.null,status.neq.Cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingNf) {
      const { data: updatedNf } = await supabase
        .from('notas_fiscais')
        .update(nfFields)
        .eq('id', existingNf.id)
        .select('id')
        .single()
      if (updatedNf) {
        notaFiscal = { ...nfFields, id: updatedNf.id, numero: null, data_emissao: null, omie_os_id: osId ? String(osId) : null } as typeof notaFiscal
        await supabase
          .from('omie_sync')
          .update({ nota_fiscal_id: updatedNf.id, updated_at: new Date().toISOString() })
          .eq('compra_id', compraId)
      }
    } else {
      const { data: insertedNf } = await supabase
        .from('notas_fiscais')
        .insert(nfFields)
        .select('id')
        .single()
      if (insertedNf) {
        notaFiscal = { ...nfFields, id: insertedNf.id, numero: null, data_emissao: null, omie_os_id: osId ? String(osId) : null } as typeof notaFiscal
        await supabase
          .from('omie_sync')
          .update({ nota_fiscal_id: insertedNf.id, updated_at: new Date().toISOString() })
          .eq('compra_id', compraId)
      }
    }
  } else {
    osId = existingOsId
  }

  // Para boleto_parcelado: mesma lógica do path de criação — usar legacy path.
  const parcelasResult2 = splitType === 'boleto_parcelado'
    ? null
    : buildParcelasFromSessions(
        (allPaidSessions ?? []) as PaidCheckoutSession[],
        valorTotalCentavos
      )
  const numParcelas = parcelasResult2?.nQtdeParc ?? compra.numero_parcelas ?? 1
  const codParc = parcelasResult2
    ? parcelasResult2.cCodParc
    : resolveOmieCodParc(String(formaPagamento), numParcelas, checkoutMetodoPagamento)
  // Fiscal-only: OMIE never generates/sends payment documents
  const envFlags = { enviarBoleto: false as const, enviarPix: false as const }
  const numeroPropostaResolution2 = resolveNumeroProposta({
    compraImagempropostaId,
    imagemPropostaPk: toNumber(imagemProposta?.id),
  })
  if (numeroPropostaResolution2.warning) {
    console.warn(`[OMIE_PROPOSTA] compra_id=${compraId} ${numeroPropostaResolution2.warning}`)
  }
  const numeroProposta = numeroPropostaResolution2.numeroProposta
  const descricaoTemplate =
    typeof nfseConfig.descricao_servico_template === 'string' &&
    nfseConfig.descricao_servico_template.trim() !== ''
      ? nfseConfig.descricao_servico_template
      : DEFAULT_DESCRICAO_SERVICO_TEMPLATE
  const clienteNome =
    cliente.nome_fantasia ??
    cliente.razaosocial ??
    cliente.nome ??
    'Cliente'
  const pagamentosLabel = buildPagamentosLabel(
    allPaidSessions ?? [],
    String(formaPagamento),
    numParcelas
  )
  const descricaoServicoFormatada = normalizeDescricaoServico(renderTemplate(descricaoTemplate, {
    numero_proposta: numeroProposta,
    celebridade: celebridade ?? '',
    cliente_nome: clienteNome,
    cidade: compra.regiaocomprada ?? '',
    uf: cliente.estado ?? '',
    vigencia: compra.tempoocomprado ?? '',
    segmento: segmento ?? '',
    subsegmento: subsegmento ?? '',
    negocio: subsegmento ?? '',
    pagamentos: pagamentosLabel,
  }).trim())
  const osEtapa = normalizeEtapa(nfseConfig.os_etapa, '50')
  const enviarLinkNfse = false
  const enviarBoleto = false
  const enviarPix = false
  const departamentoPayload = normalizeDepartamentoPayload(nfseConfig.departamento_payload)
  const departamentosCodigos = parseDepartamentosCodigos(
    nfseConfig.departamentos_codigos
  )

  const clienteIdForPayload =
    clienteId ??
    toNumber(omieSync?.omie_cliente_id) ??
    undefined
  const serviceIdForPayload =
    serviceId ??
    toNumber(omieSync?.omie_servico_id) ??
    undefined
  const shouldBuildOsPayload =
    skipOsCreation && clienteIdForPayload != null && serviceIdForPayload != null && osId != null

  if (shouldBuildOsPayload) {
    const osPayload = buildCanonicalOsPayload({
      compraId: compra.id,
      clienteOmieId: clienteIdForPayload!,
      email: cliente.email,
      cidadePrestacaoServico,
      codParc,
      osEtapa,
      quantidadeParcelas: numParcelas,
      dataVenda: formatDate(dataPagamentoConfirmado ?? compra.data_compra),
      enviarLinkNfse,
      enviarBoleto,
      enviarPix,
      departamentosCodigos,
      departamentoPayload,
      numeroProposta,
      descricaoServico: descricaoServicoFormatada || `Servico ${celebridade || 'Upsell'}`,
      serviceId: serviceIdForPayload!,
      codigoServicoMunicipal: nfseConfig.codigo_servico_municipal,
      codigoLc116: nfseConfig.codigo_lc116,
      tipoTributacao: nfseConfig.tipo_tributacao,
      retencaoIss: nfseConfig.retencao_iss,
      aliquotaIss: nfseConfig.aliquota_iss,
      nfNumero: notaFiscal?.numero ?? undefined,
      vendedorNome: vendedorNome ?? undefined,
      vendedorOmieCodigo: vendedorOmieCodigo ?? undefined,
      agenciaNome: agenciaNome ?? undefined,
      nCodProj: omieProjetoId ?? undefined,
      codigoCategoria: nfseConfig.codigo_categoria ?? undefined,
      contaCorrenteId: nfseConfig.conta_corrente_id ?? undefined,
      metodoPagamento: checkoutMetodoPagamento ?? undefined,
      paymentId: gatewayPaymentId ?? undefined,
      nsu: gatewayNsu ?? undefined,
      observacoes,
      tipoVenda: compra.tipo_venda ?? undefined,
      valorTotal: valorTotalSafe,
      parcelasExplicitas: parcelasResult2?.parcelas,
      dataCompetencia: formatDate(dataPagamentoConfirmado ?? compra.data_compra),
      ...(skipOsCreation && osId != null
        ? { operation: 'alterar' as const, existingOsId: osId }
        : {}),
    })
    osPayloadForSync = osPayload as Record<string, unknown>
    await supabase
      .from('omie_sync')
      .update({
        omie_os_payload: osPayloadForSync,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)
  }

  if (backfillPayloadOnly) {
    await supabase
      .from('omie_sync')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)

    return jsonResponse(200, {
      success: true,
      compra_id: compraId,
      omie_os_id: osId ? String(osId) : null,
      status: 'payload_backfilled',
      backfill_payload_only: true,
      payloads_persisted: {
        cliente: clientePayloadForSync !== null,
        servico: servicePayloadForSync !== null,
        os: osPayloadForSync !== null,
      },
    })
  }

  // -- Polling StatusOS --
  const omieAppKey = Deno.env.get('OMIE_APP_KEY') ?? ''
  const omieAppSecret = Deno.env.get('OMIE_APP_SECRET') ?? ''
  const omieBaseUrl = Deno.env.get('OMIE_BASE_URL') ?? 'https://app.omie.com.br/api/v1'
  const statusPollDelaysMs = parsePollDelaysMs(Deno.env.get('OMIE_STATUS_POLL_DELAYS_MS'))
  const statusPollAttemptTimeoutMs = readPositiveIntEnv(
    'OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS',
    DEFAULT_STATUS_POLL_ATTEMPT_TIMEOUT_MS
  )

  let cStatusLote = ''
  let statusResponse: Record<string, unknown> | null = null
  const pollingStartedAt = Date.now()

  console.log(
    `[OMIE_STATUS_POLL] start compra_id=${compraId} omie_os_id=${osId ?? 'n/a'} delays_ms=${statusPollDelaysMs.join(',')} timeout_ms=${statusPollAttemptTimeoutMs}`
  )

  for (let i = 0; i < statusPollDelaysMs.length + 1; i++) {
    const attempt = i + 1
    const delayAppliedMs = i > 0 ? statusPollDelaysMs[i - 1] : 0
    if (delayAppliedMs > 0) await sleep(delayAppliedMs)
    const attemptStartedAt = Date.now()

    try {
      statusResponse = await postOmieWithTimeout(
        `${omieBaseUrl}/servicos/os/`,
        {
          call: 'StatusOS',
          app_key: omieAppKey,
          app_secret: omieAppSecret,
          param: [{ nCodOS: Number(osId) }],
        },
        statusPollAttemptTimeoutMs
      )
    } catch (error) {
      statusResponse = null
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(
        `[OMIE_STATUS_POLL] attempt=${attempt} compra_id=${compraId} omie_os_id=${osId ?? 'n/a'} delay_ms=${delayAppliedMs} elapsed_ms=${Date.now() - attemptStartedAt} result=network_error error="${errorMessage}"`
      )
      continue
    }

    const lista = statusResponse?.ListaRpsNfse as Record<string, unknown>[] | undefined
    cStatusLote = String(lista?.[0]?.cStatusLote ?? '')
    console.log(
      `[OMIE_STATUS_POLL] attempt=${attempt} compra_id=${compraId} omie_os_id=${osId ?? 'n/a'} delay_ms=${delayAppliedMs} elapsed_ms=${Date.now() - attemptStartedAt} cStatusLote=${cStatusLote || 'empty'}`
    )

    if (cStatusLote === '004' || cStatusLote === '003') break
  }

  console.log(
    `[OMIE_STATUS_POLL] done compra_id=${compraId} omie_os_id=${osId ?? 'n/a'} final_status=${cStatusLote || 'pending'} elapsed_ms=${Date.now() - pollingStartedAt}`
  )

  const resolvedNfId = notaFiscal?.id ?? null
  const syncClienteId = clienteId ? String(clienteId) : (omieSync?.omie_cliente_id ?? null)
  const syncServicoId = serviceId ? String(serviceId) : (omieSync?.omie_servico_id ?? null)

  // -- Handle polling outcomes --
  if (cStatusLote === '003') {
    const lista = statusResponse?.ListaRpsNfse as Record<string, unknown>[] | undefined
    const erroPrefeitura = String(lista?.[0]?.cMsgLote ?? 'Erro retornado pela prefeitura')

    if (resolvedNfId) {
      await supabase
        .from('notas_fiscais')
        .update({
          status: 'Error',
          erro_mensagem: erroPrefeitura,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedNfId)
    }

    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'failed' satisfies OmieSyncStatus,
        omie_cliente_id: syncClienteId,
        omie_servico_id: syncServicoId,
        omie_os_id: osId ? String(osId) : null,
        last_error: erroPrefeitura,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)

    notifyOmieIntegrationFailed(supabase, compraId, {
      code: 'NFSE_PREFEITURA_ERROR',
      last_error: erroPrefeitura,
      omie_os_id: osId ? String(osId) : null,
    }, omieOperationalLabels())
    return jsonResponse(200, {
      success: false,
      compra_id: compraId,
      omie_os_id: osId ? String(osId) : null,
      status: 'error',
      error: erroPrefeitura,
    })
  }

  if (cStatusLote !== '004') {
    if (resolvedNfId) {
      await supabase
        .from('notas_fiscais')
        .update({
          status: 'awaiting_nfse',
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedNfId)
    }

    await supabase
      .from('omie_sync')
      .update({
        omie_status: 'pending' satisfies OmieSyncStatus,
        omie_cliente_id: syncClienteId,
        omie_servico_id: syncServicoId,
        omie_os_id: osId ? String(osId) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('compra_id', compraId)

    return jsonResponse(200, {
      success: true,
      compra_id: compraId,
      omie_os_id: osId ? String(osId) : null,
      status: 'awaiting_nfse',
    })
  }

  // -- cStatusLote === '004' — ObterNFSe --
  let nfseData: Record<string, unknown> | null = null
  try {
    const nfseRes = await fetch(`${omieBaseUrl}/servicos/osdocs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call: 'ObterNFSe',
        app_key: omieAppKey,
        app_secret: omieAppSecret,
        param: [{ nCodOS: Number(osId) }],
      }),
    })
    nfseData = (await nfseRes.json()) as Record<string, unknown>
  } catch {
    nfseData = null
  }

  const cNumNFSe = String(nfseData?.cNumNFSe ?? '')
  const dDtFat = nfseData?.dDtFat ? parseDDMMYYYY(String(nfseData.dDtFat)) : null
  const cPdfNFSe = nfseData?.cPdfNFSe ? String(nfseData.cPdfNFSe) : null
  const cXmlNFSe = nfseData?.cXmlNFSe ? String(nfseData.cXmlNFSe) : null
  const cUrlNfse = nfseData?.cUrlNfse ? String(nfseData.cUrlNfse) : null
  const cCodVerif = nfseData?.cCodVerif ? String(nfseData.cCodVerif) : null

  if (resolvedNfId) {
    await supabase
      .from('notas_fiscais')
      .update({
        status: 'Issued',
        numero: cNumNFSe || null,
        data_emissao: dDtFat,
        pdf_url: cPdfNFSe,
        xml_url: cXmlNFSe,
        omie_nfse_url: cUrlNfse,
        codigo_verificacao: cCodVerif,
        emissor: 'omie',
        erro_mensagem: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedNfId)
  }

  await supabase
    .from('omie_sync')
    .update({
      omie_status: 'synced' satisfies OmieSyncStatus,
      omie_cliente_id: syncClienteId,
      omie_servico_id: syncServicoId,
      omie_os_id: osId ? String(osId) : null,
      nota_fiscal_id: resolvedNfId ?? null,
      nf_numero: cNumNFSe || null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('compra_id', compraId)

  emitOperationalEventEnriched(supabase, {
    event_type: OPERATIONAL_EVENT_TYPES.OMIE_INTEGRATION_SYNCED,
    compra_id: compraId,
    source: 'omie-orchestrator',
    dedupe_key: `omie_synced:${compraId}`,
    metadata: {
      omie_os_id: osId != null ? String(osId) : null,
      nf_numero: cNumNFSe || null,
    },
    label_overrides: omieOperationalLabels(),
  })

  return jsonResponse(200, {
    success: true,
    compra_id: compraId,
    omie_os_id: osId ? String(osId) : null,
    status: 'synced',
    numero: cNumNFSe || null,
  })
})
