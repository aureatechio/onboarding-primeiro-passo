type Stage =
  | 'ingestion'
  | 'eligibility'
  | 'prompt'
  | 'generation'
  | 'upload'
  | 'persistence'
  | 'delivery'

export interface LogContext {
  jobId?: string
  compraId?: string
  stage: Stage
  group?: string
  format?: string
}

function emit(
  level: string,
  ctx: LogContext,
  message: string,
  extra?: Record<string, unknown>,
) {
  const entry = { level, ts: new Date().toISOString(), ...ctx, message, ...extra }
  const serialized = JSON.stringify(entry)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.log(serialized)
}

export const log = {
  info: (ctx: LogContext, msg: string, extra?: Record<string, unknown>) =>
    emit('info', ctx, msg, extra),
  warn: (ctx: LogContext, msg: string, extra?: Record<string, unknown>) =>
    emit('warn', ctx, msg, extra),
  error: (ctx: LogContext, msg: string, extra?: Record<string, unknown>) =>
    emit('error', ctx, msg, extra),
}
