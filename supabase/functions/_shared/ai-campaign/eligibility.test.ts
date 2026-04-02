import { assertEquals } from 'jsr:@std/assert'
import { checkAiCampaignEligibility } from './eligibility.ts'

function createMockSupabase(compra: Record<string, unknown> | null, error: { message: string; code: string } | null = null) {
  return {
    from: (_table: string) => ({
      select: (_fields: string) => ({
        eq: (_col: string, _val: string) => ({
          maybeSingle: async () => ({ data: compra, error }),
        }),
      }),
    }),
  // deno-lint-ignore no-explicit-any
  } as any
}

Deno.test('eligible when checkout_status=pago and clicksign_status=Assinado', async () => {
  const supabase = createMockSupabase({
    id: 'abc',
    cliente_id: 'c1',
    celebridade: 'cel1',
    checkout_status: 'pago',
    clicksign_status: 'Assinado',
    vendaaprovada: false,
  })
  const result = await checkAiCampaignEligibility(supabase, 'abc')
  assertEquals(result.eligible, true)
  assertEquals(result.reason, null)
})

Deno.test('eligible when vendaaprovada=true and clicksign_status=Assinado', async () => {
  const supabase = createMockSupabase({
    id: 'abc',
    cliente_id: 'c1',
    celebridade: 'cel1',
    checkout_status: 'pendente',
    clicksign_status: 'Assinado',
    vendaaprovada: true,
  })
  const result = await checkAiCampaignEligibility(supabase, 'abc')
  assertEquals(result.eligible, true)
})

Deno.test('not eligible when compra not paid', async () => {
  const supabase = createMockSupabase({
    id: 'abc',
    cliente_id: 'c1',
    celebridade: 'cel1',
    checkout_status: 'pendente',
    clicksign_status: 'Assinado',
    vendaaprovada: false,
  })
  const result = await checkAiCampaignEligibility(supabase, 'abc')
  assertEquals(result.eligible, false)
  assertEquals(result.reason, 'compra_nao_paga')
})

Deno.test('not eligible when contract not signed', async () => {
  const supabase = createMockSupabase({
    id: 'abc',
    cliente_id: 'c1',
    celebridade: 'cel1',
    checkout_status: 'pago',
    clicksign_status: 'Pendente',
    vendaaprovada: false,
  })
  const result = await checkAiCampaignEligibility(supabase, 'abc')
  assertEquals(result.eligible, false)
  assertEquals(result.reason, 'contrato_nao_assinado')
})

Deno.test('not eligible when compra not found', async () => {
  const supabase = createMockSupabase(null)
  const result = await checkAiCampaignEligibility(supabase, 'missing-id')
  assertEquals(result.eligible, false)
  assertEquals(result.reason, 'compra_not_found')
  assertEquals(result.compra, null)
})

Deno.test('not eligible on DB error', async () => {
  const supabase = createMockSupabase(null, { message: 'connection failed', code: '500' })
  const result = await checkAiCampaignEligibility(supabase, 'any-id')
  assertEquals(result.eligible, false)
  assertEquals(result.reason, 'db_error')
  assertEquals(result.compra, null)
})
