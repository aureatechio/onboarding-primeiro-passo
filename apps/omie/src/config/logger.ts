import { createLogger } from '@aurea/shared/logger'
import { config } from './env.js'

export const logger = createLogger({ level: config.LOG_LEVEL, nodeEnv: config.NODE_ENV })
