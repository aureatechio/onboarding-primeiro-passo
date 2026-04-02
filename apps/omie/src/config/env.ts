import { config as dotenvConfig } from 'dotenv'
import { z } from 'zod'

// Carregar variáveis de ambiente do arquivo .env
dotenvConfig()

const envSchema = z.object({
  // OMIE
  OMIE_APP_KEY: z.string().min(1, 'OMIE_APP_KEY é obrigatória'),
  OMIE_APP_SECRET: z.string().min(1, 'OMIE_APP_SECRET é obrigatória'),
  OMIE_API_URL: z.string().url().default('https://app.omie.com.br/api/v1/geral/clientes/'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL deve ser uma URL válida'),
  SUPABASE_KEY: z.string().min(1, 'SUPABASE_KEY é obrigatória'),
  SUPABASE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive('SUPABASE_TIMEOUT_MS deve ser um inteiro positivo')
    .default(5000),

  // Webhook
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET é obrigatória'),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missingVars = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    // eslint-disable-next-line no-console
    console.error('❌ Erro na validação de variáveis de ambiente:')
    // eslint-disable-next-line no-console
    console.error(missingVars)
    // eslint-disable-next-line no-console
    console.error('\nPor favor, verifique o arquivo .env e .env.example')
    process.exit(1)
  }

  return result.data
}

export const config = loadEnv()
