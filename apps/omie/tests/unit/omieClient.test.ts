process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { ExternalApiError } from '@aurea/shared/errors'

vi.mock('axios', () => {
  const mockPost = vi.fn()
  const create = vi.fn(() => ({ post: mockPost }))
  return {
    default: {
      create,
      isAxiosError: (err: unknown) =>
        typeof err === 'object' && err !== null && 'isAxiosError' in err,
    },
    __mockPost: mockPost,
  }
})

describe('omie-client', () => {
  let incluirContato: typeof import('../../src/services/omie-client').incluirContato
  let mapOmieError: typeof import('../../src/services/omie-client').mapOmieError
  let withRetry: typeof import('../../src/services/omie-client').withRetry
  let mockPost: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../../src/services/omie-client')
    incluirContato = mod.incluirContato
    mapOmieError = mod.mapOmieError
    withRetry = mod.withRetry
    const axiosMod = await import('axios')
    mockPost = (axiosMod as unknown as { __mockPost: ReturnType<typeof vi.fn> }).__mockPost
    mockPost.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('incluirContato', () => {
    it('deve retornar omie_codigo em caso de sucesso', async () => {
      mockPost.mockResolvedValueOnce({ data: { codigo_cliente_omie: 12345 } })

      const result = await incluirContato({
        razao_social: 'Teste',
        nome_fantasia: 'Teste',
        cnpj_cpf: '12345678000190',
        endereco: 'Rua X',
        endereco_numero: '1',
        bairro: 'B',
        cidade: 'C',
        estado: 'SP',
        cep: '01234567',
        complemento: '',
        email: 'a@b.com',
        tags: [],
        observacao: '',
      })

      expect(result).toEqual({ omie_codigo: '12345' })
    })
  })

  describe('mapOmieError', () => {
    it('deve mapear faultstring duplicado para 409', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { faultstring: 'Registro duplicado no sistema', faultcode: '' },
        },
        code: 'ERR_BAD_RESPONSE',
        message: 'Request failed',
      }

      const result = mapOmieError(axiosError)
      expect(result.statusCode).toBe(409)
      expect(result.message).toContain('duplicado')
    })

    it('deve mapear faultcode -53 para 409', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { faultstring: 'Algum erro', faultcode: '-53' },
        },
        code: 'ERR_BAD_RESPONSE',
        message: 'Request failed',
      }

      const result = mapOmieError(axiosError)
      expect(result.statusCode).toBe(409)
    })

    it('deve mapear timeout para 504', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout',
      }

      const result = mapOmieError(axiosError)
      expect(result.statusCode).toBe(504)
    })

    it('deve mapear HTTP 500 para 503', () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 500, data: { faultstring: 'Internal error' } },
        code: 'ERR_BAD_RESPONSE',
        message: 'Request failed',
      }

      const result = mapOmieError(axiosError)
      expect(result.statusCode).toBe(503)
    })
  })

  describe('withRetry', () => {
    it('deve retornar resultado na primeira tentativa se sucesso', async () => {
      const fn = vi.fn().mockResolvedValue('ok')
      const result = await withRetry(fn)
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('não deve fazer retry em erro 409', async () => {
      const error409 = new ExternalApiError('OMIE', 'Duplicado', 409)
      const fn = vi.fn().mockRejectedValue(error409)

      await expect(withRetry(fn)).rejects.toMatchObject({ statusCode: 409 })
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('deve fazer retry até 3x em erro 503', async () => {
      vi.useFakeTimers()
      const error503 = new ExternalApiError('OMIE', 'Server error', 503)
      const fn = vi.fn()
        .mockRejectedValueOnce(error503)
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce('ok')

      const promise = withRetry(fn)

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      const result = await promise
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('deve lançar último erro após esgotar tentativas', async () => {
      const error503 = new ExternalApiError('OMIE', 'Server error', 503)
      let callCount = 0
      const fn = vi.fn(() => {
        callCount++
        return Promise.reject(error503)
      })

      // Use real timers with small delay override
      const origWithRetry = withRetry
      await expect(origWithRetry(fn, 1)).rejects.toMatchObject({ statusCode: 503 })
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
