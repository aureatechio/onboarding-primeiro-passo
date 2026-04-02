import { assertEquals } from 'jsr:@std/assert'
import { resolveVendedorOmieCodigo } from './vendedor-mapping.ts'

Deno.test('resolveVendedorOmieCodigo returns mapped code when active seller is valid', () => {
  const result = resolveVendedorOmieCodigo({
    omie_ativo: true,
    omie_usuario_codigo: 12345,
  })

  assertEquals(result, { codigo: 12345, motivo: 'ok' })
})

Deno.test('resolveVendedorOmieCodigo returns missing code reason when seller has no OMIE code', () => {
  const result = resolveVendedorOmieCodigo({
    omie_ativo: true,
    omie_usuario_codigo: null,
  })

  assertEquals(result, { codigo: null, motivo: 'omie_usuario_codigo_ausente' })
})

Deno.test('resolveVendedorOmieCodigo returns inactive reason when seller is inactive', () => {
  const result = resolveVendedorOmieCodigo({
    omie_ativo: false,
    omie_usuario_codigo: 999,
  })

  assertEquals(result, { codigo: null, motivo: 'vendedor_omie_inativo' })
})
