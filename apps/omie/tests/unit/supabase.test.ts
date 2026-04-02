process.env.OMIE_APP_KEY = 'test_omie_key';
process.env.OMIE_APP_SECRET = 'test_omie_secret';
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test_supabase_key';
process.env.SUPABASE_TIMEOUT_MS = '50';
process.env.WEBHOOK_SECRET = 'test_webhook_secret';
process.env.NODE_ENV = 'test';

import { createClient } from '@supabase/supabase-js';
import {
  getCelebridadeById,
  getRegiaoById,
  getVendedorComAgencia,
  upsertOmieSync,
  initializeSupabaseClient,
} from '../../src/services/supabase';
import { ValidationError, ServiceError } from '@aurea/shared/errors';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

type QueryResponse = { data: unknown; error: unknown };

describe('Supabase Service', () => {
  const mockCreateClient = createClient as unknown as {
    mockReturnValue: (value: unknown) => void
    mock: { calls: unknown[][] }
  }
  let queryResponses: Record<string, QueryResponse>;
  let upsertResponses: Record<string, QueryResponse>;

  beforeEach(() => {
    queryResponses = {};
    upsertResponses = {};

    const from = vi.fn((table: string) => {
      const response = queryResponses[table] ?? { data: null, error: null };
      const upsertResponse = upsertResponses[table] ?? { data: null, error: null };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(response),
        limit: vi.fn().mockResolvedValue(response),
        upsert: vi.fn().mockResolvedValue(upsertResponse),
      };
    });

    mockCreateClient.mockReturnValue({ from });
    initializeSupabaseClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar o client com fetch customizado', () => {
    const [, , options] = mockCreateClient.mock.calls[0];
    expect(options.global.fetch).toBeInstanceOf(Function);
  });

  it('deve retornar celebridade quando encontrada', async () => {
    queryResponses.celebridades = { data: { id: 1, nome: 'Celebridade X' }, error: null };

    await expect(getCelebridadeById(1)).resolves.toEqual({ id: 1, nome: 'Celebridade X' });
  });

  it('deve lançar erro quando região não é encontrada', async () => {
    queryResponses.regioes = { data: null, error: null };

    await expect(getRegiaoById(999)).rejects.toMatchObject({
      statusCode: 400,
      code: 'SUPABASE_NOT_FOUND',
    });
  });

  it('deve enriquecer vendedor com agência quando aplicável', async () => {
    queryResponses.vendedores = {
      data: { id: 10, nome: 'Vendedor A', tem_agencia: true, agencia_id: 5 },
      error: null,
    };
    queryResponses.agencias = { data: { id: 5, nome: 'Agência B' }, error: null };

    await expect(getVendedorComAgencia(10)).resolves.toEqual({
      vendedor: { id: 10, nome: 'Vendedor A', tem_agencia: true, agencia_id: 5 },
      agencia: { id: 5, nome: 'Agência B' },
    });
  });

  it('deve retornar agência nula quando vendedor não tem agência', async () => {
    queryResponses.vendedores = {
      data: { id: 11, nome: 'Vendedor C', tem_agencia: false, agencia_id: null },
      error: null,
    };

    await expect(getVendedorComAgencia(11)).resolves.toEqual({
      vendedor: { id: 11, nome: 'Vendedor C', tem_agencia: false, agencia_id: null },
      agencia: null,
    });
  });

  it('deve lançar erro quando vendedor tem agência mas sem agencia_id', async () => {
    queryResponses.vendedores = {
      data: { id: 12, nome: 'Vendedor D', tem_agencia: true, agencia_id: null },
      error: null,
    };

    await expect(getVendedorComAgencia(12)).rejects.toBeInstanceOf(ValidationError);
  });

  describe('upsertOmieSync', () => {
    it('deve realizar upsert com sucesso sem lançar erro', async () => {
      upsertResponses.omie_sync = { data: null, error: null };

      await expect(
        upsertOmieSync({
          compra_id: '550e8400-e29b-41d4-a716-446655440000',
          omie_status: 'success',
          omie_cliente_id: '12345',
          attempts: 1,
          synced_at: new Date().toISOString(),
        })
      ).resolves.toBeUndefined();
    });

    it('deve lançar ServiceError quando Supabase retorna erro', async () => {
      upsertResponses.omie_sync = {
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      };

      await expect(
        upsertOmieSync({
          compra_id: '550e8400-e29b-41d4-a716-446655440000',
          omie_status: 'error',
          attempts: 1,
        })
      ).rejects.toBeInstanceOf(ServiceError);
    });
  });
});
