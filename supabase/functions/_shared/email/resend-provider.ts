import type { EmailProvider } from './provider.ts'
import {
  EmailProviderError,
  type EmailSendRequest,
  type EmailSendResult,
} from './types.ts'

interface CreateResendEmailProviderParams {
  apiKey: string
  fetchFn?: typeof fetch
}

interface ResendErrorBody {
  message?: string
  name?: string
  error?: {
    code?: string
    message?: string
  }
}

interface ResendSuccessBody {
  id?: string
}

export function createResendEmailProvider(
  params: CreateResendEmailProviderParams
): EmailProvider {
  const fetchFn = params.fetchFn ?? fetch

  return {
    async send(request: EmailSendRequest): Promise<EmailSendResult> {
      if (!params.apiKey.trim()) {
        throw new EmailProviderError({
          message: 'RESEND_API_KEY não configurada.',
          providerCode: 'missing_api_key',
          retryable: false,
        })
      }

      if (!request.from?.trim() || !request.subject?.trim() || !request.html?.trim()) {
        throw new EmailProviderError({
          message: 'Payload de email inválido.',
          providerCode: 'invalid_request',
          retryable: false,
        })
      }

      const headers = new Headers({
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      })

      if (request.idempotencyKey?.trim()) {
        headers.set('Idempotency-Key', request.idempotencyKey.trim().slice(0, 256))
      }

      const response = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: request.from,
          to: Array.isArray(request.to) ? request.to : [request.to],
          cc: request.cc
            ? Array.isArray(request.cc)
              ? request.cc
              : [request.cc]
            : undefined,
          subject: request.subject,
          html: request.html,
          text: request.text,
          reply_to: request.replyTo,
        }),
      })

      const raw = await response.text()
      const parsed = tryParseJson<ResendSuccessBody & ResendErrorBody>(raw)

      if (!response.ok || !parsed?.id) {
        const providerCode =
          parsed?.error?.code ?? parsed?.name ?? `http_${response.status}`
        const message =
          parsed?.error?.message ??
          parsed?.message ??
          'Falha ao enviar email via Resend.'
        const retryable = response.status >= 500 || response.status === 409

        throw new EmailProviderError({
          message,
          providerCode,
          status: response.status,
          retryable,
        })
      }

      return {
        provider: 'resend',
        providerId: parsed.id,
      }
    },
  }
}

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
