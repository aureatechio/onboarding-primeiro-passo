import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { log } from './logger.ts'

export interface EligibilityResult {
  eligible: boolean
  reason: string | null
  compra: {
    id: string
    cliente_id: string | null
    celebridade: string | null
    checkout_status: string | null
    clicksign_status: string | null
    vendaaprovada: boolean | null
  } | null
}

export async function checkAiCampaignEligibility(
  supabase: SupabaseClient,
  compraId: string
): Promise<EligibilityResult> {
  const { data: compra, error } = await supabase
    .from('compras')
    .select(
      'id, cliente_id, celebridade, checkout_status, clicksign_status, vendaaprovada'
    )
    .eq('id', compraId)
    .maybeSingle()

  if (error) {
    log.error({ compraId, stage: 'eligibility' }, 'DB error checking eligibility', { error: error.message })
    return { eligible: false, reason: 'db_error', compra: null }
  }
  if (!compra) {
    return { eligible: false, reason: 'compra_not_found', compra: null }
  }

  const isPaid = compra.checkout_status === 'pago'

  if (!isPaid) {
    return { eligible: false, reason: 'compra_nao_paga', compra }
  }

  const isSigned = compra.clicksign_status === 'Assinado'

  if (!isSigned) {
    return { eligible: false, reason: 'contrato_nao_assinado', compra }
  }

  return { eligible: true, reason: null, compra }
}
