import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ClicksignSigner {
  signer_key: string
  email: string
  phone: string | null
  name: string
}

export interface TransactionPipeline {
  compra_id: string
  cliente_id: string | null
  compra_descricao: string | null
  valor_total: number
  compra_numero_parcelas: number | null
  compra_checkout_status: string
  vendaaprovada: boolean | null
  compra_created_at: string
  // Clicksign contract
  clicksign_envelope_id: string | null
  clicksign_document_key: string | null
  clicksign_status: string | null
  clicksign_signed_document_url: string | null
  clicksign_error_message: string | null
  clicksign_signers: ClicksignSigner[] | null
  clicksign_metadata: Record<string, unknown> | null
  data_envio_assinatura: string | null
  data_assinatura_concluida: string | null
  statusproducao: string | null
  // Checkout URL
  checkout_url: string | null
  checkout_expires_at: string | null
  // Vendedor
  vendedor_nome: string | null
  vendedor_email: string | null
  agencia_nome?: string | null
  // Stepper OMIE: tipo venda, segmento, subsegmento, celebridade, praca
  tipo_venda: string | null
  segmento_nome: string | null
  subsegmento_nome: string | null
  celebridade_nome: string | null
  praca: string | null
  // Checkout
  session_id: string | null
  checkout_session_status: string | null
  metodo_pagamento: string | null
  valor_centavos: number | null
  parcelas: number | null
  cliente_nome: string | null
  cliente_documento: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  checkout_created_at: string | null
  checkout_completed_at: string | null
  payment_id: string | null
  payment_status: number | null
  payment_nsu: string | null
  numero_proposta: string | null
  nota_fiscal_id: string | null
  nfe_status: string | null
  nfe_numero: string | null
  nfe_emitida_em: string | null
  nfe_pdf_url: string | null
  nfe_xml_url: string | null
  nfe_created_at: string | null
  nfe_updated_at: string | null
  nfe_emissor: string | null
  nf_omie_os_id: string | null
  nfe_erro_mensagem: string | null
  omie_sync_id: string | null
  omie_status: string | null
  omie_cliente_id: string | null
  omie_servico_id: string | null
  omie_os_id: string | null
  omie_attempts: number | null
  omie_last_error: string | null
  omie_synced_at: string | null
  omie_created_at: string | null
  omie_cliente_payload: Record<string, unknown> | null
  omie_servico_payload: Record<string, unknown> | null
  omie_os_payload: Record<string, unknown> | null
  pipeline_status: string
  current_stage: string
  last_activity_at: string | null
  lead_id: string | null
  // Split (boleto parcelado / 2 meios)
  split_group_id: string | null
  split_sessoes_pagas: number | null
  split_total_sessoes: number | null
  split_type: string | null
  // Recorrencia
  vigencia_meses: number | null
  checkout_recorrencia_enabled: boolean | null
  valor_parcela_recorrente_centavos: number | null
  recorrencia_total_parcelas: number | null
}

interface UseTransactionResult {
  data: TransactionPipeline | null
  loading: boolean
  error: string | null
  fetch: (compraId: string) => Promise<void>
}

async function resolveAgencyName(leadId: string | null): Promise<string | null> {
  if (!leadId) return null

  const { data: lead } = await supabase
    .from('leads')
    .select('agencia, agenciavendas, agenciatext')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (!lead) return null

  if (lead.agenciavendas) {
    const { data: agenciaVendas } = await supabase
      .from('agenciavendas')
      .select('nome')
      .eq('id', lead.agenciavendas)
      .maybeSingle()

    if (agenciaVendas?.nome) return agenciaVendas.nome
  }

  if (lead.agencia) {
    const { data: agencia } = await supabase
      .from('agencias')
      .select('nome')
      .eq('id', lead.agencia)
      .maybeSingle()

    if (agencia?.nome) return agencia.nome
  }

  return lead.agenciatext?.trim() || null
}

export function useTransaction(): UseTransactionResult {
  const [data, setData] = useState<TransactionPipeline | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (compraId: string) => {
    setLoading(true)
    setError(null)
    setData(null)

    const { data: result, error: err } = await supabase
      .from('v_transaction_pipeline')
      .select('*')
      .eq('compra_id', compraId)
      .maybeSingle()

    if (err) {
      setError(err.message)
    } else if (!result) {
      setError('Transação não encontrada. Verifique o compra_id.')
    } else {
      const agenciaNome = await resolveAgencyName((result.lead_id as string | null) ?? null)
      setData({ ...(result as TransactionPipeline), agencia_nome: agenciaNome })
    }

    setLoading(false)
  }, [])

  return { data, loading, error, fetch }
}
