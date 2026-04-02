import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const FALLBACK_VENDEDOR = 'Nao informado'
export const FALLBACK_CELEBRIDADE = 'Nao informada'

export async function fetchCompraIdFromSessionId(
  supabase: SupabaseClient,
  sessionId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('compra_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (error) {
    console.warn('[OPERATIONAL_LABELS] session lookup failed', sessionId, error.message)
    return null
  }
  return data?.compra_id ?? null
}

/**
 * Resolve vendedor (compras.vendedoresponsavel -> vendedores.nome) e celebridade
 * (celebridadesReferencia -> sgc_celebridades), alinhado ao omie-orchestrator.
 */
export async function fetchCompraOperacionalLabels(
  supabase: SupabaseClient,
  compraId: string
): Promise<{ vendedor_nome: string; celebridade_nome: string }> {
  const { data: compra, error } = await supabase
    .from('compras')
    .select('celebridade, vendedoresponsavel')
    .eq('id', compraId)
    .maybeSingle()

  if (error || !compra) {
    console.warn('[OPERATIONAL_LABELS] compra fetch failed', compraId, error?.message)
    return { vendedor_nome: FALLBACK_VENDEDOR, celebridade_nome: FALLBACK_CELEBRIDADE }
  }

  let vendedor_nome = FALLBACK_VENDEDOR
  const vendedorId = compra.vendedoresponsavel as string | null
  if (vendedorId) {
    const { data: v } = await supabase.from('vendedores').select('nome').eq('id', vendedorId).maybeSingle()
    const n = v?.nome?.trim()
    if (n) vendedor_nome = n
  }

  let celebridade_nome = FALLBACK_CELEBRIDADE
  const celebId = compra.celebridade as string | null
  if (celebId) {
    const { data: ref } = await supabase
      .from('celebridadesReferencia')
      .select('nome, nomeJuridico')
      .eq('id', celebId)
      .maybeSingle()
    if (ref?.nome?.trim()) celebridade_nome = ref.nome.trim()
    else if (ref?.nomeJuridico?.trim()) celebridade_nome = ref.nomeJuridico.trim()
    else {
      const { data: sgc } = await supabase
        .from('sgc_celebridades')
        .select('name')
        .eq('uuid', celebId)
        .maybeSingle()
      if (sgc?.name?.trim()) celebridade_nome = sgc.name.trim()
    }
  }

  return { vendedor_nome, celebridade_nome }
}
