import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { createResendEmailProvider } from './resend-provider.ts'
import { EmailProviderError } from './types.ts'

Deno.test('createResendEmailProvider sends email and returns provider id', async () => {
  const provider = createResendEmailProvider({
    apiKey: 're_test',
    fetchFn: async (_input, init) => {
      const headers = init?.headers as Headers
      assertEquals(headers.get('Authorization'), 'Bearer re_test')
      assertEquals(headers.get('Idempotency-Key'), 'checkout-link/req-1')
      return new Response(JSON.stringify({ id: 'email-id-1' }), { status: 200 })
    },
  })

  const result = await provider.send({
    from: 'AUREA <no-reply@aurea.com>',
    to: 'cliente@exemplo.com',
    subject: 'Teste',
    html: '<p>ok</p>',
    idempotencyKey: 'checkout-link/req-1',
  })

  assertEquals(result.provider, 'resend')
  assertEquals(result.providerId, 'email-id-1')
})

Deno.test('createResendEmailProvider throws EmailProviderError on provider failure', async () => {
  const provider = createResendEmailProvider({
    apiKey: 're_test',
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'invalid_idempotency_key',
            message: 'invalid key',
          },
        }),
        { status: 400 }
      ),
  })

  await assertRejects(
    () =>
      provider.send({
        from: 'AUREA <no-reply@aurea.com>',
        to: 'cliente@exemplo.com',
        subject: 'Teste',
        html: '<p>ok</p>',
      }),
    EmailProviderError,
    'invalid key'
  )
})

Deno.test('createResendEmailProvider maps cc validation_error from Resend', async () => {
  const provider = createResendEmailProvider({
    apiKey: 're_test',
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          name: 'validation_error',
          message:
            'Invalid `cc` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format.',
        }),
        { status: 422 }
      ),
  })

  const error = await assertRejects(
    () =>
      provider.send({
        from: 'AUREA <no-reply@aurea.com>',
        to: 'cliente@exemplo.com',
        cc: ['financeiro@exemplo.com.'],
        subject: 'Teste',
        html: '<p>ok</p>',
      }),
    EmailProviderError
  )

  const providerError = error as EmailProviderError
  assertEquals(providerError.providerCode, 'validation_error')
  assertEquals(providerError.status, 422)
  assertEquals(providerError.code, 'EMAIL_PROVIDER_ERROR')
})
