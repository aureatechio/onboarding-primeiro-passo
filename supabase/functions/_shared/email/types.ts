export interface EmailSendRequest {
  from: string
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
  replyTo?: string
  text?: string
  idempotencyKey?: string
}

export interface EmailSendResult {
  provider: 'resend'
  providerId: string
}

export type EmailProviderErrorCode = 'EMAIL_PROVIDER_ERROR'

export class EmailProviderError extends Error {
  readonly code: EmailProviderErrorCode
  readonly provider: 'resend'
  readonly providerCode: string | null
  readonly status: number | null
  readonly retryable: boolean

  constructor(params: {
    message: string
    providerCode?: string | null
    status?: number | null
    retryable?: boolean
  }) {
    super(params.message)
    this.name = 'EmailProviderError'
    this.code = 'EMAIL_PROVIDER_ERROR'
    this.provider = 'resend'
    this.providerCode = params.providerCode ?? null
    this.status = params.status ?? null
    this.retryable = params.retryable ?? true
  }
}
