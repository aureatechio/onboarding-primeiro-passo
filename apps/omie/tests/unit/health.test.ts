import request from 'supertest';
import type { Express } from 'express';
import { getTestApp } from '../helpers/testApp';

// Força health como "healthy" no ambiente de teste (não depende de rede/serviços).
vi.mock('../../src/services/supabase.js', () => ({
  checkSupabaseConnection: vi.fn(async () => ({ status: 'ok' })),
}));

vi.mock('../../src/services/omie.js', () => ({
  checkOmieCredentials: vi.fn(() => ({ status: 'ok' })),
}));

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Health Check', () => {
  describe('GET /health', () => {
    it('deve retornar status 200 quando serviço está saudável', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('dependencies');
    });

    it('deve retornar informações sobre dependências', async () => {
      const response = await request(app).get('/health');

      expect(response.body.dependencies).toHaveProperty('supabase');
      expect(response.body.dependencies).toHaveProperty('omie');
      expect(response.body.dependencies.supabase).toHaveProperty('status');
      expect(response.body.dependencies.omie).toHaveProperty('status');
    });

    it('deve responder em menos de 100ms', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100);
    });
  });
});
