import { assertEquals } from 'jsr:@std/assert'
import { resolveNumeroProposta } from './proposta-number.ts'

Deno.test('resolveNumeroProposta uses imagemProposta.id when available', () => {
  const resolution = resolveNumeroProposta({
    compraImagempropostaId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
    imagemPropostaPk: 6182,
  })

  assertEquals(resolution.numeroProposta, '6182')
  assertEquals(resolution.warning, undefined)
})

Deno.test('resolveNumeroProposta falls back to compras.imagemproposta_id', () => {
  const resolution = resolveNumeroProposta({
    compraImagempropostaId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
    imagemPropostaPk: null,
  })

  assertEquals(resolution.numeroProposta, '3f2055d1-606e-45d1-a288-b2a8c14b694d')
  assertEquals(
    resolution.warning,
    'NUMERO_PROPOSTA_FALLBACK_UUID: imagemProposta.id nao encontrado, usando compras.imagemproposta_id'
  )
})
