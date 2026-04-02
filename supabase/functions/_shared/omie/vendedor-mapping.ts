export type VendedorOmieInput = {
  omie_ativo?: boolean | null
  omie_usuario_codigo?: unknown
}

export type VendedorOmieResolution = {
  codigo: number | null
  motivo:
    | 'vendedor_nao_encontrado'
    | 'vendedor_omie_inativo'
    | 'omie_usuario_codigo_ausente'
    | 'omie_usuario_codigo_invalido'
    | 'ok'
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

export const resolveVendedorOmieCodigo = (
  vendedor: VendedorOmieInput | null
): VendedorOmieResolution => {
  if (!vendedor) {
    return { codigo: null, motivo: 'vendedor_nao_encontrado' }
  }

  if (vendedor.omie_ativo === false) {
    return { codigo: null, motivo: 'vendedor_omie_inativo' }
  }

  if (vendedor.omie_usuario_codigo === undefined || vendedor.omie_usuario_codigo === null) {
    return { codigo: null, motivo: 'omie_usuario_codigo_ausente' }
  }

  const codigo = toNumber(vendedor.omie_usuario_codigo)
  if (!codigo || codigo <= 0) {
    return { codigo: null, motivo: 'omie_usuario_codigo_invalido' }
  }

  return { codigo, motivo: 'ok' }
}
