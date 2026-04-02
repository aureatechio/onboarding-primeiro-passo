import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UpsertAction = 'incluir_os' | 'alterar_os'

export interface OmiePreviewResponse {
  success: boolean
  compra_id: string
  action: UpsertAction
  payload_canonico: Record<string, unknown>
  warnings: string[]
  correlation_id: string
  response_summary: string
  duration_ms: number
}

export interface OmieExecuteResponse {
  success: boolean
  compra_id: string
  action: UpsertAction
  omie_os_id: string
  synced_from_db: boolean
  warnings: string[]
  correlation_id?: string
}

export interface OmiePullVendedoresResponse {
  success: boolean
  pages: number
  total_remote: number
  inserted: number
  updated: number
  inactivated: number
  skipped_invalid: number
  errors: number
  details: Array<Record<string, unknown>>
  elapsed_ms: number
}

export interface OmiePushVendedoresResponse {
  success: boolean
  mode: 'preview' | 'apply'
  total_local: number
  processed: number
  created: number
  updated: number
  linked: number
  skipped_invalid: number
  errors: number
  details: Array<Record<string, unknown>>
  elapsed_ms: number
}

export interface OmieSyncVendedoresResponse {
  success: boolean
  push: OmiePushVendedoresResponse
  pull: OmiePullVendedoresResponse
  elapsed_ms: number
}

export interface OmieAuditEntry {
  id: string
  created_at: string
  acao: string
  erro: boolean
  erro_mensagem: string | null
  request_payload: Record<string, unknown> | null
  response_payload: Record<string, unknown> | null
}

interface UseOmieUpsertOsReturn {
  loadingPreview: boolean
  loadingExecute: boolean
  loadingAudit: boolean
  loadingSync: boolean
  error: string | null
  technicalError: string | null
  preview: OmiePreviewResponse | null
  executeResult: OmieExecuteResponse | null
  syncResult: OmieSyncVendedoresResponse | null
  audit: OmieAuditEntry | null
  gerarPreview: (compraId: string, adminPassword: string) => Promise<boolean>
  executarUpsert: (compraId: string, adminPassword: string) => Promise<boolean>
  sincronizarVendedoresOmie: () => Promise<boolean>
  carregarUltimaAuditoria: (compraId: string) => Promise<void>
  clear: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY as string | undefined
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined
const normalizeBearerToken = (token?: string): string =>
  (token ?? '')
    .trim()
    .replace(/^Bearer\s+/i, '')

const isLikelyJwt = (token: string): boolean => {
  const jwtParts = token.split('.')
  return jwtParts.length === 3 && jwtParts.every((part) => part.length > 0)
}

const UPSERT_BEARER_KEY = normalizeBearerToken(SERVICE_ROLE_KEY)
const INTERNAL_BEARER_KEY =
  normalizeBearerToken(SECRET_KEY) || normalizeBearerToken(SERVICE_ROLE_KEY)

function includesField(data: Record<string, unknown>, field: string): boolean {
  const details = data.details
  if (!details || typeof details !== 'object') return false
  const fields = (details as Record<string, unknown>).fields
  if (!Array.isArray(fields)) return false
  return fields.some((item) => item === field)
}

function getFieldList(data: Record<string, unknown>): string[] {
  const details = data.details
  if (!details || typeof details !== 'object') return []
  const fields = (details as Record<string, unknown>).fields
  if (!Array.isArray(fields)) return []
  return fields.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function buildTechnicalError(code: string | undefined, message: string | undefined, data: Record<string, unknown>): string {
  if (!code) return JSON.stringify(data)
  const lines: string[] = [`${code}: ${message ?? ''}`.trim()]
  const fields = getFieldList(data)
  if (fields.length > 0) {
    lines.push(`fields: ${fields.join(', ')}`)
  }
  const correlationId = data.correlation_id
  if (typeof correlationId === 'string' && correlationId.trim().length > 0) {
    lines.push(`correlation_id: ${correlationId}`)
  }
  return lines.join('\n')
}

function mapErrorMessage(code?: string, message?: string, data: Record<string, unknown> = {}): string {
  switch (code) {
    case 'INVALID_REQUEST':
      if ((message ?? '').includes('compra_id')) {
        return 'Compra invalida. Verifique o UUID informado.'
      }
      return message || 'Requisicao invalida para o upsert OMIE.'
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa invalida.'
    case 'INTERNAL_AUTH_INVALID':
      return 'Credencial interna invalida para executar upsert. Verifique VITE_SUPABASE_SECRET_KEY ou VITE_SUPABASE_SERVICE_ROLE_KEY.'
    case 'MISSING_REQUIRED_FIELDS':
      if (includesField(data, 'vendedor_omie_codigo') || includesField(data, 'vendedoresponsavel')) {
        return 'Vendedor OMIE nao configurado para esta compra. Verifique vendedor responsavel e codigo OMIE.'
      }
      return 'Dados obrigatorios ausentes para gerar/atualizar OS na OMIE.'
    case 'UNAUTHORIZED':
      if ((message ?? '').toLowerCase().includes('authorization')) {
        return 'Credencial interna invalida para executar upsert.'
      }
      return 'Senha administrativa invalida.'
    case 'LOCK_NOT_ACQUIRED':
      return 'Compra em processamento por outra execucao. Tente em instantes.'
    case 'COMPRA_NOT_FOUND':
      return 'Compra nao encontrada no CRM.'
    case 'CLIENTE_NOT_FOUND':
      return 'Cliente da compra nao encontrado.'
    case 'NFSE_CONFIG_NOT_FOUND':
      return 'Configuracao fiscal OMIE ativa nao encontrada.'
    case 'OS_NOT_EDITABLE':
      return 'OS faturada/cancelada; alteracao nao permitida.'
    case 'OMIE_ERROR':
    case 'OMIE_REQUEST_FAILED':
      return 'Falha de comunicacao com OMIE. Tente novamente.'
    default:
      return message || 'Erro inesperado ao processar solicitacao.'
  }
}

function mapSyncErrorMessage(code?: string, message?: string): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Credencial interna invalida para sincronizar vendedores OMIE.'
    case 'METHOD_NOT_ALLOWED':
      return 'Metodo invalido para sincronizacao de vendedores.'
    case 'CONFIG_ERROR':
      return message || 'Configuracao ausente para sincronizacao de vendedores.'
    case 'SYNC_FAILED':
      return message || 'Falha ao sincronizar vendedores OMIE.'
    case 'PUSH_FAILED':
      return message || 'Falha ao sincronizar vendedores locais para OMIE.'
    case 'PULL_FAILED':
      return message || 'Falha ao reconciliar vendedores da OMIE para o banco.'
    default:
      return message || 'Erro inesperado ao sincronizar vendedores OMIE.'
  }
}

function sanitizeCompraId(input: string): string {
  return input.trim()
}

export function useOmieUpsertOs(): UseOmieUpsertOsReturn {
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingExecute, setLoadingExecute] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [loadingSync, setLoadingSync] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [technicalError, setTechnicalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<OmiePreviewResponse | null>(null)
  const [executeResult, setExecuteResult] = useState<OmieExecuteResponse | null>(null)
  const [syncResult, setSyncResult] = useState<OmieSyncVendedoresResponse | null>(null)
  const [audit, setAudit] = useState<OmieAuditEntry | null>(null)

  const clear = useCallback(() => {
    setError(null)
    setTechnicalError(null)
    setPreview(null)
    setExecuteResult(null)
    setSyncResult(null)
  }, [])

  const carregarUltimaAuditoria = useCallback(async (compraId: string) => {
    setLoadingAudit(true)
    try {
      const { data, error: auditError } = await supabase
        .from('notas_fiscais_logs')
        .select('id, created_at, acao, erro, erro_mensagem, request_payload, response_payload')
        .eq('compra_id', compraId)
        .or(
          'acao.like.omie_upsert_preview_%,acao.like.omie_upsert_execute_%'
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (auditError) {
        throw new Error(auditError.message)
      }
      setAudit((data as OmieAuditEntry | null) ?? null)
    } finally {
      setLoadingAudit(false)
    }
  }, [])

  const carregarAuditoriaComTolerancia = useCallback(
    async (compraId: string) => {
      try {
        await carregarUltimaAuditoria(compraId)
      } catch (auditErr) {
        const detail = `AUDIT_LOAD_FAILED: ${
          auditErr instanceof Error ? auditErr.message : String(auditErr)
        }`
        setTechnicalError((prev) => (prev ? `${prev}\n${detail}` : detail))
      }
    },
    [carregarUltimaAuditoria]
  )

  const gerarPreview = useCallback(
    async (compraId: string, adminPassword: string): Promise<boolean> => {
      setLoadingPreview(true)
      setError(null)
      setTechnicalError(null)
      setPreview(null)
      const correlationId = crypto.randomUUID()
      const safeCompraId = sanitizeCompraId(compraId)

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/omie-preview-upsert-os`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
            'x-correlation-id': correlationId,
          },
          body: JSON.stringify({ compra_id: safeCompraId }),
        })
        const data = (await response.json()) as Record<string, unknown>
        if (!response.ok) {
          const code = typeof data.code === 'string' ? data.code : undefined
          const message = typeof data.message === 'string' ? data.message : undefined
          setError(mapErrorMessage(code, message, data))
          setTechnicalError(buildTechnicalError(code, message, data))
          setLoadingPreview(false)
          await carregarAuditoriaComTolerancia(safeCompraId)
          return false
        }

        setPreview(data as unknown as OmiePreviewResponse)
        setLoadingPreview(false)
        await carregarAuditoriaComTolerancia(safeCompraId)
        return true
      } catch (err) {
        setError('Falha de conexao com o servidor.')
        setTechnicalError(err instanceof Error ? err.message : String(err))
        setLoadingPreview(false)
        return false
      }
    },
    [carregarAuditoriaComTolerancia]
  )

  const executarUpsert = useCallback(
    async (compraId: string, adminPassword: string): Promise<boolean> => {
      setLoadingExecute(true)
      setError(null)
      setTechnicalError(null)
      setExecuteResult(null)
      const correlationId = crypto.randomUUID()
      const safeCompraId = sanitizeCompraId(compraId)

      try {
        if (!UPSERT_BEARER_KEY) {
          setError('Credencial interna ausente para executar upsert.')
          setTechnicalError('MISSING_UPSERT_BEARER: configure VITE_SUPABASE_SERVICE_ROLE_KEY')
          setLoadingExecute(false)
          return false
        }
        if (!isLikelyJwt(UPSERT_BEARER_KEY)) {
          setError('Credencial interna invalida para executar upsert.')
          setTechnicalError(
            'INVALID_UPSERT_BEARER_FORMAT: VITE_SUPABASE_SERVICE_ROLE_KEY deve ser JWT valido do projeto'
          )
          setLoadingExecute(false)
          return false
        }
        const response = await fetch(`${SUPABASE_URL}/functions/v1/omie-upsert-os`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${UPSERT_BEARER_KEY}`,
            'x-admin-password': adminPassword,
            'x-correlation-id': correlationId,
          },
          body: JSON.stringify({ compra_id: safeCompraId }),
        })
        const data = (await response.json()) as Record<string, unknown>
        if (!response.ok) {
          const code = typeof data.code === 'string' ? data.code : undefined
          const message = typeof data.message === 'string' ? data.message : undefined
          setError(mapErrorMessage(code, message, data))
          setTechnicalError(buildTechnicalError(code, message, data))
          setLoadingExecute(false)
          await carregarAuditoriaComTolerancia(safeCompraId)
          return false
        }

        setExecuteResult(data as unknown as OmieExecuteResponse)
        setLoadingExecute(false)
        await carregarAuditoriaComTolerancia(safeCompraId)
        return true
      } catch (err) {
        setError('Falha de conexao com o servidor.')
        setTechnicalError(err instanceof Error ? err.message : String(err))
        setLoadingExecute(false)
        return false
      }
    },
    [carregarAuditoriaComTolerancia]
  )

  const sincronizarVendedoresOmie = useCallback(async (): Promise<boolean> => {
    setLoadingSync(true)
    setError(null)
    setTechnicalError(null)
    setSyncResult(null)

    try {
      if (!INTERNAL_BEARER_KEY) {
        setError('Credencial interna ausente para sincronizar vendedores OMIE.')
        setTechnicalError(
          'MISSING_INTERNAL_BEARER: configure VITE_SUPABASE_SECRET_KEY ou VITE_SUPABASE_SERVICE_ROLE_KEY'
        )
        setLoadingSync(false)
        return false
      }

      const sequenceStartedAt = Date.now()
      const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/omie-push-vendedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INTERNAL_BEARER_KEY}`,
        },
        body: JSON.stringify({
          mode: 'apply',
          limit: 1000,
        }),
      })

      const pushData = (await pushResponse.json()) as Record<string, unknown>
      if (!pushResponse.ok) {
        const code = typeof pushData.code === 'string' ? pushData.code : 'PUSH_FAILED'
        const message =
          typeof pushData.message === 'string'
            ? pushData.message
            : 'Falha ao sincronizar vendedores locais para OMIE.'
        setError(mapSyncErrorMessage(code, message))
        setTechnicalError(buildTechnicalError(code, message, pushData))
        setLoadingSync(false)
        return false
      }

      const pullResponse = await fetch(`${SUPABASE_URL}/functions/v1/omie-sync-vendedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INTERNAL_BEARER_KEY}`,
        },
      })

      const pullData = (await pullResponse.json()) as Record<string, unknown>
      if (!pullResponse.ok) {
        const code = typeof pullData.code === 'string' ? pullData.code : 'PULL_FAILED'
        const message =
          typeof pullData.message === 'string'
            ? pullData.message
            : 'Falha ao reconciliar vendedores da OMIE para o banco.'
        setError(mapSyncErrorMessage(code, message))
        setTechnicalError(buildTechnicalError(code, message, pullData))
        setLoadingSync(false)
        return false
      }

      setSyncResult({
        success: true,
        push: pushData as unknown as OmiePushVendedoresResponse,
        pull: pullData as unknown as OmiePullVendedoresResponse,
        elapsed_ms: Date.now() - sequenceStartedAt,
      })
      setLoadingSync(false)
      return true
    } catch (err) {
      setError('Falha de conexao com o servidor.')
      setTechnicalError(err instanceof Error ? err.message : String(err))
      setLoadingSync(false)
      return false
    }
  }, [])

  return {
    loadingPreview,
    loadingExecute,
    loadingAudit,
    loadingSync,
    error,
    technicalError,
    preview,
    executeResult,
    syncResult,
    audit,
    gerarPreview,
    executarUpsert,
    sincronizarVendedoresOmie,
    carregarUltimaAuditoria,
    clear,
  }
}
