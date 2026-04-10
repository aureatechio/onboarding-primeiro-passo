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

  const isSigned = compra.clicksign_status === 'Assinado'
  if (!isSigned) {
    return { eligible: false, reason: 'contrato_nao_assinado', compra }
  }

  const isPaid = compra.checkout_status === 'pago'
  if (isPaid) {
    return { eligible: true, reason: null, compra }
  }

  const manuallyAllowed = await hasOnboardingAccessOverride(supabase, compraId)
  if (manuallyAllowed) {
    return { eligible: true, reason: null, compra }
  }

  return { eligible: false, reason: 'compra_nao_paga', compra }
}

export async function hasOnboardingAccessOverride(
  supabase: SupabaseClient,
  compraId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('onboarding_access')
    .select('status, allowed_until')
    .eq('compra_id', compraId)
    .eq('status', 'allowed')
    .maybeSingle()

  if (error || !data) return false

  if (data.allowed_until) {
    const expiresAt = new Date(data.allowed_until)
    if (expiresAt.getTime() < Date.now()) return false
  }

  return true
}
