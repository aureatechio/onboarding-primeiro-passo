import { validateWebhookPayload } from '../../src/validators/omieWebhook';

const basePayload = {
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
};

describe('Validação de payload do webhook', () => {
  it('aceita CNPJ com formatação', () => {
    const result = validateWebhookPayload(basePayload);
    expect(result.success).toBe(true);
  });

  it('aceita CNPJ sem formatação', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          cnpj: '12345678000190',
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(true);
  });

  it('rejeita CNPJ inválido', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          cnpj: '123',
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });

  it('rejeita email inválido', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          email: 'email-invalido',
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });

  it('rejeita quando celebridade está ausente', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          celebridade: undefined,
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });

  it('rejeita quando regiao está ausente', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          regiao: undefined,
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });

  it('rejeita quando vendedor está ausente', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          vendedor: undefined,
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });

  it('rejeita quando tem_agencia=true e agencia ausente', () => {
    const payload = {
      ...basePayload,
      dados: {
        cliente: {
          ...basePayload.dados.cliente,
          vendedor: {
            ...basePayload.dados.cliente.vendedor,
            tem_agencia: true,
            agencia: undefined,
          },
        },
      },
    };

    const result = validateWebhookPayload(payload);
    expect(result.success).toBe(false);
  });
});
