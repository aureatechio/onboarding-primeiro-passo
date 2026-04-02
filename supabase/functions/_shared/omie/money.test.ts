import { assertEquals } from 'jsr:@std/assert@1'
import {
  centavosToReais,
  parseMoneyToCentavos,
  parseReaisToCentavos,
  resolveValorTotalCentavos,
  resolveValorTotalCentavosForSplit,
} from './money.ts'

Deno.test('parseMoneyToCentavos mantém inteiro como centavos canônicos', () => {
  assertEquals(parseMoneyToCentavos(9_178_236), 9_178_236)
  assertEquals(parseMoneyToCentavos('9178236'), 9_178_236)
})

Deno.test('parseMoneyToCentavos converte valor decimal para centavos', () => {
  assertEquals(parseMoneyToCentavos(91_782.36), 9_178_236)
  assertEquals(parseMoneyToCentavos('91782.36'), 9_178_236)
})

Deno.test('parseMoneyToCentavos rejeita valores inválidos', () => {
  assertEquals(parseMoneyToCentavos(0), undefined)
  assertEquals(parseMoneyToCentavos(-1), undefined)
  assertEquals(parseMoneyToCentavos(''), undefined)
  assertEquals(parseMoneyToCentavos('abc'), undefined)
})

// --- parseReaisToCentavos ---

Deno.test('parseReaisToCentavos converte decimal para centavos', () => {
  assertEquals(parseReaisToCentavos(91_782.36), 9_178_236)
  assertEquals(parseReaisToCentavos('91782.36'), 9_178_236)
})

Deno.test('parseReaisToCentavos converte inteiro de reais para centavos (não assume centavos)', () => {
  // Cenário do bug: compra.valor_total = "15870.00" → Number() = 15870 (inteiro)
  // Deve retornar 1_587_000 (centavos), não 15_870 (bug anterior)
  assertEquals(parseReaisToCentavos(15_870), 1_587_000)
  assertEquals(parseReaisToCentavos('15870'), 1_587_000)
  assertEquals(parseReaisToCentavos('15870.00'), 1_587_000)
})

Deno.test('parseReaisToCentavos rejeita valores inválidos', () => {
  assertEquals(parseReaisToCentavos(0), undefined)
  assertEquals(parseReaisToCentavos(-1), undefined)
  assertEquals(parseReaisToCentavos(''), undefined)
  assertEquals(parseReaisToCentavos('abc'), undefined)
})

Deno.test('centavosToReais converte para formato da borda OMIE', () => {
  assertEquals(centavosToReais(9_178_236), 91_782.36)
  assertEquals(centavosToReais(5497), 54.97)
})

Deno.test('resolveValorTotalCentavos prioriza valor pago em checkout_sessions', () => {
  const fromCheckout = resolveValorTotalCentavos(11_109, [
    { valor_centavos: 1_110_900 },
  ])
  assertEquals(fromCheckout, 1_110_900)
})

Deno.test('resolveValorTotalCentavos usa fallback da compra sem checkout pago', () => {
  const fallbackCompra = resolveValorTotalCentavos(91_782.36, [])
  assertEquals(fallbackCompra, 9_178_236)
})

Deno.test('resolveValorTotalCentavos fallback com inteiro de reais converte corretamente (regressão bug nPercentual)', () => {
  // compra.valor_total = "15870.00" → Number() = 15870 (inteiro) → deve ser 1_587_000 centavos
  const fallback = resolveValorTotalCentavos('15870.00', [])
  assertEquals(fallback, 1_587_000)
  const fallbackInt = resolveValorTotalCentavos(15_870, [])
  assertEquals(fallbackInt, 1_587_000)
})

// --- resolveValorTotalCentavosForSplit ---

Deno.test('resolveValorTotalCentavosForSplit: boleto_parcelado usa compra.valor_total (ignora sessões pagas)', () => {
  // Cenário: 12x R$1.333,33 — apenas 1 parcela paga (R$1.333,33 = 133_333 centavos)
  // Esperado: valor total do contrato R$15.999,96 = 1_599_996 centavos
  const result = resolveValorTotalCentavosForSplit(
    15_999.96,
    [{ valor_centavos: 133_333 }],
    'boleto_parcelado'
  )
  assertEquals(result, 1_599_996)
})

Deno.test('resolveValorTotalCentavosForSplit: split_type null usa soma das sessões pagas', () => {
  const result = resolveValorTotalCentavosForSplit(
    91_782.36,
    [{ valor_centavos: 1_110_900 }],
    null
  )
  assertEquals(result, 1_110_900)
})

Deno.test('resolveValorTotalCentavosForSplit: split_type dual_payment usa soma das sessões', () => {
  const result = resolveValorTotalCentavosForSplit(
    200,
    [{ valor_centavos: 10_000 }, { valor_centavos: 15_000 }],
    'dual_payment'
  )
  assertEquals(result, 25_000)
})

Deno.test('resolveValorTotalCentavosForSplit: boleto_parcelado sem sessões pagas usa compra.valor_total', () => {
  const result = resolveValorTotalCentavosForSplit(15_999.96, [], 'boleto_parcelado')
  assertEquals(result, 1_599_996)
})
