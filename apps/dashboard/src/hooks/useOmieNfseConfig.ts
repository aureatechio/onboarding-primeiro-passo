import { useState, useCallback } from 'react'
import {
  fromOmieTemplateDescription,
  toOmieTemplateDescription,
} from '@/lib/omie-template-description'

export interface OmieNfseConfig {
  id: string
  codigo_servico_municipal: string
  codigo_lc116: string
  tipo_tributacao: string
  aliquota_iss: number
  retencao_iss: 'S' | 'N'
  aliquota_ir: number
  retencao_ir: 'S' | 'N'
  aliquota_inss: number
  retencao_inss: 'S' | 'N'
  aliquota_pis: number
  retencao_pis: 'S' | 'N'
  aliquota_cofins: number
  retencao_cofins: 'S' | 'N'
  aliquota_csll: number
  retencao_csll: 'S' | 'N'
  codigo_categoria: string
  conta_corrente_id: number | null
  os_etapa: string
  enviar_link_nfse: boolean
  enviar_boleto: boolean
  departamentos_codigos: string
  departamento_payload: unknown[]
  descricao_servico_template: string
  usar_imagemproposta_id_como_numero: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface UseOmieNfseConfigReturn {
  config: OmieNfseConfig | null
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  fetchConfig: (password: string) => Promise<boolean>
  updateConfig: (password: string, data: Partial<OmieNfseConfig>) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const normalizeConfigForEditor = (config: OmieNfseConfig): OmieNfseConfig => ({
  ...config,
  descricao_servico_template: fromOmieTemplateDescription(config.descricao_servico_template),
})

export function useOmieNfseConfig(): UseOmieNfseConfigReturn {
  const [config, setConfig] = useState<OmieNfseConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = useCallback(() => {
    setConfig(null)
    setError(null)
    setSuccess(null)
  }, [])

  const fetchConfig = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-omie-nfse-config`, {
        method: 'GET',
        headers: {
          'x-admin-password': password,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.code === 'UNAUTHORIZED' ? 'Senha incorreta' : data.error ?? 'Erro ao buscar configuracao')
        setLoading(false)
        return false
      }

      setConfig(normalizeConfigForEditor(data.config as OmieNfseConfig))
      setLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexao com o servidor')
      setLoading(false)
      return false
    }
  }, [])

  const updateConfig = useCallback(
    async (password: string, data: Partial<OmieNfseConfig>): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)

      try {
        const payload: Partial<OmieNfseConfig> = {
          ...data,
          ...(typeof data.descricao_servico_template === 'string'
            ? {
                descricao_servico_template: toOmieTemplateDescription(
                  data.descricao_servico_template
                ),
              }
            : {}),
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/update-omie-nfse-config`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()
        if (!response.ok) {
          setError(result.code === 'UNAUTHORIZED' ? 'Senha incorreta' : result.error ?? 'Erro ao atualizar configuracao')
          setSaving(false)
          return false
        }

        setConfig(normalizeConfigForEditor(result.config as OmieNfseConfig))
        setSuccess('Configuracao salva com sucesso')
        setSaving(false)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de conexao com o servidor')
        setSaving(false)
        return false
      }
    },
    []
  )

  return { config, loading, saving, error, success, fetchConfig, updateConfig, reset }
}
