/**
 * Dispara orquestração pós-pagamento em modo fire-and-forget.
 *
 * Chama a Edge Function `omie-orchestrator` via HTTP interno usando
 * a service role key. Não bloqueia o caller — erros são logados mas
 * não propagados.
 *
 * Deve ser chamado em todo code path que transiciona
 * `compras.checkout_status` para `'pago'`, independentemente do
 * método de pagamento (cartão, PIX, boleto).
 *
 * @param compraId  UUID da compra (tabela `compras`)
 * @param sessionId UUID da checkout session (mantido por compatibilidade, não enviado ao orquestrador)
 */
export function triggerNfeEmission(
  compraId: string,
  _sessionId: string,
): void {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl) {
    console.warn('[NFE_TRIGGER] SUPABASE_URL ausente, pulando trigger')
    return
  }
  if (!serviceRoleKey) {
    console.warn('[NFE_TRIGGER] SUPABASE_SERVICE_ROLE_KEY ausente, pulando trigger')
    return
  }

  // Fire-and-forget: não aguardamos a resposta
  fetch(`${supabaseUrl}/functions/v1/omie-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ compra_id: compraId }),
  })
    .then((res) => {
      console.log(
        `[NFE_TRIGGER] Disparado para omie-orchestrator compra_id=${compraId} status=${res.status}`,
      )
    })
    .catch((err) => {
      console.error(
        `[NFE_TRIGGER] Falha ao disparar omie-orchestrator para compra_id=${compraId}: ${err.message}`,
      )
    })
}
