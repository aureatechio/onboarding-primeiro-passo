import { assertEquals } from 'jsr:@std/assert'
import {
  BOLETO_ADDRESS_LIMITS,
  calcularParcelasBoleto,
  calcularParcelasBoletoComDataBase,
  normalizeBoletoDistrict,
  parsePrimeiroVencimento,
  validateAndNormalizeBoletoAddress,
} from './boleto-parcelado.ts'

Deno.test('validateAndNormalizeBoletoAddress accepts valid payload', () => {
  const result = validateAndNormalizeBoletoAddress({
    cliente_nome: 'JOSE DA SILVA',
    cliente_documento: '123.456.789-09',
    cliente_cep: '06454-000',
    cliente_endereco: 'Alameda Rio Negro',
    cliente_numero: '503',
    cliente_bairro: 'Alphaville',
    cliente_cidade: 'Barueri',
    cliente_uf: 'sp',
  })

  assertEquals(result.valid, true)
  assertEquals(result.errors.length, 0)
  assertEquals(result.normalized.cliente_documento, '12345678909')
  assertEquals(result.normalized.cliente_cep, '06454000')
  assertEquals(result.normalized.cliente_uf, 'SP')
})

Deno.test('validateAndNormalizeBoletoAddress rejects district above max limit', () => {
  const district = 'A'.repeat(BOLETO_ADDRESS_LIMITS.districtMax + 1)
  const result = validateAndNormalizeBoletoAddress({
    cliente_nome: 'EMPRESA TESTE LTDA',
    cliente_documento: '48.225.686/0001-45',
    cliente_cep: '06454-000',
    cliente_endereco: 'Alameda Rio Negro',
    cliente_numero: '503',
    cliente_bairro: district,
    cliente_cidade: 'Barueri',
    cliente_uf: 'SP',
  })

  assertEquals(result.valid, false)
  assertEquals(
    result.errors.includes(
      `cliente_bairro é obrigatório e deve ter até ${BOLETO_ADDRESS_LIMITS.districtMax} caracteres`
    ),
    true
  )
})

Deno.test('validateAndNormalizeBoletoAddress rejects invalid zip/uf', () => {
  const result = validateAndNormalizeBoletoAddress({
    cliente_nome: 'EMPRESA TESTE LTDA',
    cliente_documento: '48.225.686/0001-45',
    cliente_cep: '123',
    cliente_endereco: 'Rua Teste',
    cliente_numero: '10',
    cliente_bairro: 'Centro',
    cliente_cidade: 'Sao Paulo',
    cliente_uf: 'SaoPaulo',
  })

  assertEquals(result.valid, false)
  assertEquals(result.errors.includes('cliente_cep deve ter 8 dígitos'), true)
  assertEquals(result.errors.includes('cliente_uf deve ter 2 letras'), true)
})

Deno.test('normalizeBoletoDistrict trims and truncates district to max length', () => {
  const longDistrict = `  ${'A'.repeat(BOLETO_ADDRESS_LIMITS.districtMax + 10)}  `
  const normalized = normalizeBoletoDistrict(longDistrict)

  assertEquals(normalized?.length, BOLETO_ADDRESS_LIMITS.districtMax)
  assertEquals(normalized, 'A'.repeat(BOLETO_ADDRESS_LIMITS.districtMax))
})

Deno.test('normalizeBoletoDistrict returns null for empty-like values', () => {
  assertEquals(normalizeBoletoDistrict('   '), null)
  assertEquals(normalizeBoletoDistrict(null), null)
  assertEquals(normalizeBoletoDistrict(undefined), null)
})

// --- calcularParcelasBoletoComDataBase ---

Deno.test('calcularParcelasBoletoComDataBase returns correct dates for 3 parcelas starting Apr 15', () => {
  const result = calcularParcelasBoletoComDataBase(100000, 3, new Date('2026-04-15T00:00:00'))

  assertEquals(result.length, 3)
  assertEquals(result[0].vencimento.toISOString().split('T')[0], '2026-04-15')
  assertEquals(result[1].vencimento.toISOString().split('T')[0], '2026-05-15')
  assertEquals(result[2].vencimento.toISOString().split('T')[0], '2026-06-15')
})

Deno.test('calcularParcelasBoleto distributes value correctly (remainder on last)', () => {
  const result = calcularParcelasBoleto(100001, 3, 30)

  assertEquals(result[0].valorCentavos, 33333)
  assertEquals(result[1].valorCentavos, 33333)
  assertEquals(result[2].valorCentavos, 33335)
  assertEquals(
    result.reduce((sum, parcela) => sum + parcela.valorCentavos, 0),
    100001
  )
})

Deno.test('calcularParcelasBoletoComDataBase distributes value correctly (remainder on last)', () => {
  const result = calcularParcelasBoletoComDataBase(100001, 3, new Date('2026-04-15T00:00:00'))

  assertEquals(result[0].valorCentavos, 33333)
  assertEquals(result[1].valorCentavos, 33333)
  assertEquals(result[2].valorCentavos, 33335)
  assertEquals(
    result.reduce((sum, parcela) => sum + parcela.valorCentavos, 0),
    100001
  )
})

Deno.test('calcularParcelasBoletoComDataBase handles month overflow (Jan 31 + 1 month)', () => {
  const result = calcularParcelasBoletoComDataBase(60000, 2, new Date('2026-01-31T00:00:00'))

  assertEquals(result[0].vencimento.toISOString().split('T')[0], '2026-01-31')
  assertEquals(result[1].vencimento.toISOString().split('T')[0], '2026-02-28')
})

Deno.test('calcularParcelasBoletoComDataBase single parcela returns exact date', () => {
  const result = calcularParcelasBoletoComDataBase(50000, 1, new Date('2026-07-20T00:00:00'))

  assertEquals(result.length, 1)
  assertEquals(result[0].vencimento.toISOString().split('T')[0], '2026-07-20')
  assertEquals(result[0].valorCentavos, 50000)
})

// --- parsePrimeiroVencimento ---

Deno.test('parsePrimeiroVencimento accepts valid future date', () => {
  const result = parsePrimeiroVencimento('2099-04-15')
  assertEquals(result.error, undefined)
  assertEquals(result.date?.toISOString().split('T')[0], '2099-04-15')
})

Deno.test('parsePrimeiroVencimento rejects invalid format', () => {
  assertEquals(parsePrimeiroVencimento('15/04/2026').error !== undefined, true)
  assertEquals(parsePrimeiroVencimento('2026-4-15').error !== undefined, true)
  assertEquals(parsePrimeiroVencimento('not-a-date').error !== undefined, true)
})

Deno.test('parsePrimeiroVencimento rejects past date', () => {
  const result = parsePrimeiroVencimento('2020-01-01')
  assertEquals(result.error !== undefined, true)
  assertEquals(result.error?.includes('passado'), true)
})

Deno.test('parsePrimeiroVencimento rejects invalid calendar date', () => {
  const result = parsePrimeiroVencimento('2026-02-30')
  assertEquals(result.error !== undefined, true)
})
