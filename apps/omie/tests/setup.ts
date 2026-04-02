const defaults: Record<string, string> = {
  OMIE_APP_KEY: 'test_omie_key',
  OMIE_APP_SECRET: 'test_omie_secret',
  OMIE_API_URL: 'https://app.omie.com.br/api/v1/geral/clientes/',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_KEY: 'test_supabase_key',
  WEBHOOK_SECRET: 'test_webhook_secret',
  NODE_ENV: 'test',
}

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}
