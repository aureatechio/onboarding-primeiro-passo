export async function getTestApp() {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.OMIE_APP_KEY = process.env.OMIE_APP_KEY ?? 'test-key';
  process.env.OMIE_APP_SECRET = process.env.OMIE_APP_SECRET ?? 'test-secret';
  process.env.OMIE_API_URL =
    process.env.OMIE_API_URL ?? 'https://app.omie.com.br/api/v1/geral/clientes/';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
  process.env.SUPABASE_KEY = process.env.SUPABASE_KEY ?? 'test-supabase-key';
  process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'webhook-secret';
  // Deve respeitar a enum do env schema (debug|info|warn|error)
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';

  // Vitest globals
  vi.resetModules();

  const { default: app } = await import('../../src/app');
  return app;
}
