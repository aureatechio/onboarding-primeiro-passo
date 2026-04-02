import { logger } from './config/logger.js'
import { config } from './config/env.js'
import { initializeSupabaseClient } from './services/supabase.js'
import app from './app.js'

const PORT = config.PORT

// Inicializar serviços
try {
  initializeSupabaseClient()
  logger.info('Serviços inicializados com sucesso')
} catch (error) {
  logger.error({ error }, 'Erro ao inicializar serviços')
  process.exit(1)
}

// Inicialização do servidor
app.listen(PORT, () => {
  logger.info(`Servidor iniciado na porta ${PORT}`)
  logger.info(`Ambiente: ${config.NODE_ENV}`)
})
