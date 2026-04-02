import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

interface LeadRecord {
  etapa: string | null
  funil: string | null
  etapaVendedorFunil: string | null
  funilVendedor: string | null
}

type LeadGanhoOrigin = 'payment' | 'contract'

async function getLeadGanhoStageByFunil(
  supabase: SupabaseClient,
  funil: string | null
): Promise<string | null> {
  if (!funil) return null

  const { data: stageData, error } = await supabase
    .from('etapa')
    .select('id')
    .eq('funil', funil)
    .eq('index', 9)
    .single()

  if (error || !stageData?.id) return null
  return stageData.id
}

async function insertLeadLog(
  supabase: SupabaseClient,
  leadId: string,
  etapaAnterior: string | null,
  etapaPosterior: string,
  origin: LeadGanhoOrigin
) {
  const userLoog =
    origin === 'contract' ? 'Sistema - Contrato Assinado' : 'Sistema - Pagamento Aprovado'
  const descricao =
    origin === 'contract'
      ? 'Lead movido para ganho: contrato assinado + pagamento aprovado'
      : 'Lead movido para ganho: pagamento aprovado + contrato assinado'

  await supabase.from('loogsLeads').insert({
    lead: leadId,
    userLoog,
    descriçao: descricao,
    local: 'lead-stage',
    etapa_anterior: etapaAnterior,
    etapa_posterior: etapaPosterior,
  })
}

export async function moveLeadToGanhoIfEligible(
  compraId: string,
  supabase: SupabaseClient,
  origin: LeadGanhoOrigin = 'payment'
): Promise<void> {
  if (!compraId) return

  const { data: compraData, error: compraError } = await supabase
    .from('compras')
    .select('leadid, checkout_status, clicksign_status')
    .eq('id', compraId)
    .single()

  if (compraError || !compraData?.leadid) return
  if (compraData.checkout_status !== 'pago') return
  if (compraData.clicksign_status !== 'Assinado') return

  const leadId = compraData.leadid

  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('etapa, funil, etapaVendedorFunil, funilVendedor')
    .eq('id', leadId)
    .single()

  if (leadError || !leadData) return

  const lead = leadData as LeadRecord
  if (!lead.funil) return

  const leadGanhoStageId = await getLeadGanhoStageByFunil(supabase, lead.funil)
  if (!leadGanhoStageId) return

  if (lead.etapa !== leadGanhoStageId) {
    await supabase
      .from('leads')
      .update({
        etapa: leadGanhoStageId,
        entradaetapa: new Date().toISOString(),
      })
      .eq('id', leadId)

    await insertLeadLog(supabase, leadId, lead.etapa, leadGanhoStageId, origin)
  }

  if (!lead.funilVendedor) return

  const vendedorGanhoStageId = await getLeadGanhoStageByFunil(supabase, lead.funilVendedor)
  if (!vendedorGanhoStageId || lead.etapaVendedorFunil === vendedorGanhoStageId) return

  await supabase
    .from('leads')
    .update({
      etapaVendedorFunil: vendedorGanhoStageId,
      entradaetapaatualvendedor: new Date().toISOString(),
    })
    .eq('id', leadId)

  await insertLeadLog(
    supabase,
    leadId,
    lead.etapaVendedorFunil,
    vendedorGanhoStageId,
    origin
  )
}
