process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { webhookRouter } from '../../src/controllers/webhook';

describe('Webhook Router', () => {
  it('registra a rota POST /omie/cliente', () => {
    const routes = webhookRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
      }));

    const matched = routes.find(
      (route) => route.path === '/omie/cliente' && route.methods?.post
    );

    expect(matched).toBeDefined();
  });

  it('registra a rota POST /omie/ordem-servico', () => {
    const routes = webhookRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
      }));

    const matched = routes.find(
      (route) => route.path === '/omie/ordem-servico' && route.methods?.post
    );

    expect(matched).toBeDefined();
  });

  it('registra a rota POST /omie/servico', () => {
    const routes = webhookRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route?.path,
        methods: layer.route?.methods,
      }));

    const matched = routes.find(
      (route) => route.path === '/omie/servico' && route.methods?.post
    );

    expect(matched).toBeDefined();
  });
});
