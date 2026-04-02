import type { WebhookPayload } from '../validators/omieWebhook.js'
import type { VendedorEnriquecido, Celebridade, Regiao } from '../services/supabase.js'

export function stripCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '').padStart(14, '0')
}

export function splitPhone(phone: string): { ddd: string; numero: string } {
  const digits = phone.replace(/\D/g, '')
  return {
    ddd: digits.slice(0, 2),
    numero: digits.slice(2),
  }
}

export function buildOmieAddress(endereco: WebhookPayload['dados']['cliente']['endereco']) {
  return {
    endereco: endereco.logradouro,
    endereco_numero: endereco.numero,
    bairro: endereco.bairro,
    cidade: endereco.cidade,
    estado: endereco.estado,
    cep: endereco.cep.replace(/\D/g, ''),
    complemento: endereco.complemento ?? '',
  }
}

export function buildTags(celebridade: Celebridade, regiao: Regiao): string[] {
  return [`Celebridade: ${celebridade.nome}`, `Região: ${regiao.nome}`]
}

export function buildObservacao(
  vendedorEnriquecido: VendedorEnriquecido
): string {
  const { vendedor, agencia } = vendedorEnriquecido
  if (agencia) {
    return `Vendedor: ${vendedor.nome} | Agência: ${agencia.nome}`
  }
  return `Vendedor: ${vendedor.nome}`
}

export interface OmieContato {
  razao_social: string
  nome_fantasia: string
  cnpj_cpf: string
  endereco: string
  endereco_numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  complemento: string
  email: string
  tags: string[]
  observacao: string
  telefone1_ddd?: string
  telefone1_numero?: string
}

export function toOmieContato(
  payload: WebhookPayload,
  enriched: {
    celebridade: Celebridade
    regiao: Regiao
    vendedorEnriquecido: VendedorEnriquecido
  }
): OmieContato {
  const { cliente } = payload.dados
  const address = buildOmieAddress(cliente.endereco)
  const tags = buildTags(enriched.celebridade, enriched.regiao)
  const observacao = buildObservacao(enriched.vendedorEnriquecido)

  const contato: OmieContato = {
    razao_social: cliente.nome,
    nome_fantasia: cliente.nome,
    cnpj_cpf: stripCnpj(cliente.cnpj),
    ...address,
    email: cliente.email ?? '',
    tags,
    observacao,
  }

  return contato
}
