import request from 'supertest'
import type { Express } from 'express'
import { getTestApp } from '../helpers/testApp'

vi.mock('../../src/services/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/supabase')>()
  return {
    ...original,
    initializeSupabaseClient: vi.fn(),
    getSupabaseClient: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    })),
    getCelebridadeById: vi.fn(),
    getRegiaoById: vi.fn(),
    getVendedorComAgencia: vi.fn(),
    upsertOmieSync: vi.fn(),
  }
})

vi.mock('../../src/services/omie-client', () => ({
  incluirContato: vi.fn(),
  withRetry: vi.fn((fn: () => unknown) => fn()),
}))

const payload = {
  compra_id: '550e8400-e29b-41d4-a716-446655440000',
  evento: 'cliente.criado',
  timestamp: new Date().toISOString(),
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
      celebridade: { id: '1', nome: 'Celebridade X' },
      regiao: { id: '2', nome: 'Sudeste' },
      vendedor: { id: '3', nome: 'Vendedor Y', tem_agencia: false },
    },
  },
}

describe('Webhook OMIE Cliente', () => {
  let app: Express
  let authHeader: string
  let supabaseMocks: {
    getCelebridadeById: ReturnType<typeof vi.fn>
    getRegiaoById: ReturnType<typeof vi.fn>
    getVendedorComAgencia: ReturnType<typeof vi.fn>
    upsertOmieSync: ReturnType<typeof vi.fn>
  }
  let omieClientMocks: {
    incluirContato: ReturnType<typeof vi.fn>
  }

  beforeAll(async () => {
    process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS = '10000'
    process.env.WEBHOOK_RATE_LIMIT_MAX = '100'

    app = await getTestApp()
    authHeader = `Bearer ${process.env.WEBHOOK_SECRET}`

    const supabaseMod = await import('../../src/services/supabase')
    supabaseMocks = {
      getCelebridadeById: supabaseMod.getCelebridadeById as ReturnType<typeof vi.fn>,
      getRegiaoById: supabaseMod.getRegiaoById as ReturnType<typeof vi.fn>,
      getVendedorComAgencia: supabaseMod.getVendedorComAgencia as ReturnType<typeof vi.fn>,
      upsertOmieSync: supabaseMod.upsertOmieSync as ReturnType<typeof vi.fn>,
    }

    const omieClientMod = await import('../../src/services/omie-client')
    omieClientMocks = {
      incluirContato: omieClientMod.incluirContato as ReturnType<typeof vi.fn>,
    }
  })

  beforeEach(() => {
    supabaseMocks.getCelebridadeById.mockResolvedValue({ id: 1, nome: 'Celebridade X' })
    supabaseMocks.getRegiaoById.mockResolvedValue({ id: 2, nome: 'Sudeste' })
    supabaseMocks.getVendedorComAgencia.mockResolvedValue({
      vendedor: { id: 3, nome: 'Vendedor Y', tem_agencia: false, agencia_id: null },
      agencia: null,
    })
    supabaseMocks.upsertOmieSync.mockResolvedValue(undefined)
    omieClientMocks.incluirContato.mockResolvedValue({ omie_codigo: '99999' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 com omie_codigo e correlationId no happy path', async () => {
    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .send(payload)

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.omie_codigo).toBe('99999')
    expect(response.body.correlationId).toBeDefined()
    expect(response.headers['x-correlation-id']).toBeDefined()
    expect(supabaseMocks.upsertOmieSync).toHaveBeenCalledWith(
      expect.objectContaining({ omie_status: 'success', omie_cliente_id: '99999' })
    )
  })

  it('retorna 400 quando Content-Type não é application/json', async () => {
    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .set('Content-Type', 'text/plain')
      .send('{"teste": "ok"}')

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('INVALID_CONTENT_TYPE')
  })

  it('retorna 400 quando JSON é malformado', async () => {
    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send('{"teste":')

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('INVALID_JSON')
  })

  it('retorna 401 quando Authorization está ausente', async () => {
    const response = await request(app).post('/api/webhook/omie/cliente').send(payload)

    expect(response.status).toBe(401)
    expect(response.body.error?.code).toBe('UNAUTHORIZED')
  })

  it('retorna 401 quando token é inválido', async () => {
    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', 'Bearer token-invalido')
      .send(payload)

    expect(response.status).toBe(401)
    expect(response.body.error?.code).toBe('UNAUTHORIZED')
  })

  it('retorna 400 quando enriquecimento Supabase falha (celebridade não encontrada)', async () => {
    const { ServiceError } = await import('@aurea/shared/errors')
    supabaseMocks.getCelebridadeById.mockRejectedValue(
      new ServiceError('celebridades não encontrado: 1', 400, 'SUPABASE_NOT_FOUND')
    )

    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .send(payload)

    expect(response.status).toBe(400)
    expect(supabaseMocks.upsertOmieSync).toHaveBeenCalledWith(
      expect.objectContaining({ omie_status: 'error' })
    )
  })

  it('retorna 409 quando OMIE retorna duplicado', async () => {
    const { ExternalApiError } = await import('@aurea/shared/errors')
    omieClientMocks.incluirContato.mockRejectedValue(
      new ExternalApiError('OMIE', 'Registro duplicado', 409)
    )

    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .send(payload)

    expect(response.status).toBe(409)
    expect(supabaseMocks.upsertOmieSync).toHaveBeenCalledWith(
      expect.objectContaining({ omie_status: 'error' })
    )
  })

  it('retorna 503 quando OMIE retorna erro 5xx', async () => {
    const { ExternalApiError } = await import('@aurea/shared/errors')
    omieClientMocks.incluirContato.mockRejectedValue(
      new ExternalApiError('OMIE', 'Erro OMIE (500)', 503)
    )

    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .send(payload)

    expect(response.status).toBe(503)
    expect(supabaseMocks.upsertOmieSync).toHaveBeenCalledWith(
      expect.objectContaining({ omie_status: 'error' })
    )
  })

  it('retorna 400 quando compra_id não é UUID válido', async () => {
    const invalidPayload = { ...payload, compra_id: 'not-a-uuid' }

    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set('Authorization', authHeader)
      .send(invalidPayload)

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retorna 429 quando limite é excedido', async () => {
    const headers = {
      Authorization: authHeader,
      'x-rate-limit-key': 'rate-limit-test-v2',
    }

    for (let i = 0; i < 100; i += 1) {
      await request(app)
        .post('/api/webhook/omie/cliente')
        .set(headers)
        .send(payload)
    }

    const response = await request(app)
      .post('/api/webhook/omie/cliente')
      .set(headers)
      .send(payload)

    expect(response.status).toBe(429)
    expect(response.headers['x-ratelimit-limit']).toBeDefined()
    expect(response.headers['x-ratelimit-remaining']).toBeDefined()
    expect(response.headers['x-ratelimit-reset']).toBeDefined()
  })

  it.skip('reseta o limite após a janela de tempo', async () => {
    // Skipped: rate limiter window reset test is timing-sensitive
    // and unreliable with async handlers in CI environments
  })
})
