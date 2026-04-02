import {
  stripCnpj,
  splitPhone,
  buildTags,
  buildObservacao,
  buildOmieAddress,
  toOmieContato,
} from '../../src/transformers/omieTransformer'
import type { WebhookPayload } from '../../src/validators/omieWebhook'
import type { VendedorEnriquecido, Celebridade, Regiao } from '../../src/services/supabase'

describe('omieTransformer', () => {
  describe('stripCnpj', () => {
    it('deve remover pontuação de CNPJ formatado', () => {
      expect(stripCnpj('12.345.678/0001-90')).toBe('12345678000190')
    })

    it('deve manter CNPJ já limpo', () => {
      expect(stripCnpj('12345678000190')).toBe('12345678000190')
    })

    it('deve preencher com zeros à esquerda se necessário', () => {
      expect(stripCnpj('345678000190')).toBe('00345678000190')
    })
  })

  describe('splitPhone', () => {
    it('deve separar DDD e número de telefone fixo (10 dígitos)', () => {
      expect(splitPhone('1132145678')).toEqual({ ddd: '11', numero: '32145678' })
    })

    it('deve separar DDD e número de celular (11 dígitos)', () => {
      expect(splitPhone('11987654321')).toEqual({ ddd: '11', numero: '987654321' })
    })

    it('deve remover formatação antes de separar', () => {
      expect(splitPhone('(11) 98765-4321')).toEqual({ ddd: '11', numero: '987654321' })
    })
  })

  describe('buildOmieAddress', () => {
    it('deve mapear endereço para campos OMIE', () => {
      const endereco = {
        logradouro: 'Rua Exemplo',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        complemento: 'Sala 1',
      }

      expect(buildOmieAddress(endereco)).toEqual({
        endereco: 'Rua Exemplo',
        endereco_numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        complemento: 'Sala 1',
      })
    })

    it('deve usar string vazia quando complemento é undefined', () => {
      const endereco = {
        logradouro: 'Rua X',
        numero: '1',
        bairro: 'B',
        cidade: 'C',
        estado: 'SP',
        cep: '01234567',
      }

      expect(buildOmieAddress(endereco)).toHaveProperty('complemento', '')
    })
  })

  describe('buildTags', () => {
    it('deve retornar tags formatadas', () => {
      const celebridade: Celebridade = { id: 1, nome: 'Celeb X' }
      const regiao: Regiao = { id: 2, nome: 'Sudeste' }

      expect(buildTags(celebridade, regiao)).toEqual([
        'Celebridade: Celeb X',
        'Região: Sudeste',
      ])
    })
  })

  describe('buildObservacao', () => {
    it('deve retornar apenas vendedor quando sem agência', () => {
      const enriched: VendedorEnriquecido = {
        vendedor: { id: 1, nome: 'João', tem_agencia: false, agencia_id: null },
        agencia: null,
      }

      expect(buildObservacao(enriched)).toBe('Vendedor: João')
    })

    it('deve retornar vendedor e agência quando presente', () => {
      const enriched: VendedorEnriquecido = {
        vendedor: { id: 1, nome: 'João', tem_agencia: true, agencia_id: 5 },
        agencia: { id: 5, nome: 'Agência ABC' },
      }

      expect(buildObservacao(enriched)).toBe('Vendedor: João | Agência: Agência ABC')
    })
  })

  describe('toOmieContato', () => {
    it('deve compor payload completo do contato OMIE', () => {
      const payload = {
        compra_id: '550e8400-e29b-41d4-a716-446655440000',
        evento: 'cliente.criado',
        timestamp: '2024-01-01T00:00:00Z',
        dados: {
          cliente: {
            nome: 'Empresa LTDA',
            cnpj: '12.345.678/0001-90',
            email: 'contato@empresa.com',
            endereco: {
              logradouro: 'Rua Exemplo',
              numero: '123',
              bairro: 'Centro',
              cidade: 'São Paulo',
              estado: 'SP',
              cep: '01234567',
            },
            celebridade: { id: '1', nome: 'Celeb X' },
            regiao: { id: '2', nome: 'Sudeste' },
            vendedor: { id: '3', nome: 'João', tem_agencia: false },
          },
        },
      } as WebhookPayload

      const enriched = {
        celebridade: { id: 1, nome: 'Celeb X' } as Celebridade,
        regiao: { id: 2, nome: 'Sudeste' } as Regiao,
        vendedorEnriquecido: {
          vendedor: { id: 3, nome: 'João', tem_agencia: false, agencia_id: null },
          agencia: null,
        } as VendedorEnriquecido,
      }

      const result = toOmieContato(payload, enriched)

      expect(result.razao_social).toBe('Empresa LTDA')
      expect(result.nome_fantasia).toBe('Empresa LTDA')
      expect(result.cnpj_cpf).toBe('12345678000190')
      expect(result.endereco).toBe('Rua Exemplo')
      expect(result.cidade).toBe('São Paulo')
      expect(result.tags).toEqual(['Celebridade: Celeb X', 'Região: Sudeste'])
      expect(result.observacao).toBe('Vendedor: João')
      expect(result.email).toBe('contato@empresa.com')
    })
  })
})
