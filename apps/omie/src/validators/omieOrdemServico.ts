import { z } from 'zod'

const idSchema = z.union([z.string().min(1, 'ID é obrigatório'), z.number().int()])

const servicoPrestadoSchema = z.object({
  nCodServico: z.number().int().positive('nCodServico deve ser positivo'),
  nValUnit: z.number().positive('nValUnit deve ser positivo').optional(),
  cDescServ: z.string().min(1).optional(),
})

const osWebhookPayloadSchema = z.object({
  compra_id: z.string().uuid('compra_id deve ser um UUID válido'),
  evento: z.string().min(1, 'evento é obrigatório'),
  timestamp: z.string().min(1, 'timestamp é obrigatório'),
  dados: z.object({
    cliente_omie_id: z.number().int().positive('cliente_omie_id deve ser positivo'),
    email: z.string().email('email inválido'),
    cidade_prestacao_servico: z.string().min(1, 'cidade_prestacao_servico é obrigatória'),
    forma_pagamento: z.string().min(1, 'forma_pagamento é obrigatória'),
    quantidade_parcelas: z.number().int().positive().default(1),
    data_previsao: z.string().optional(),
    nf_numero: z.string().optional(),
    env_boleto: z.enum(['S', 'N']).default('N'),
    env_pix: z.enum(['S', 'N']).default('N'),
    env_link: z.enum(['S', 'N']).default('N'),
    env_via_unica: z.enum(['S', 'N']).default('N'),
    servicos_prestados: z
      .array(servicoPrestadoSchema)
      .min(1, 'servicos_prestados deve ter ao menos 1 item'),
  }),
})

export type OsWebhookPayload = z.infer<typeof osWebhookPayloadSchema>

export function validateOsWebhookPayload(payload: unknown): {
  success: boolean
  data?: OsWebhookPayload
  errors?: { path: string; message: string }[]
} {
  const result = osWebhookPayloadSchema.safeParse(payload)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return { success: false, errors }
}
