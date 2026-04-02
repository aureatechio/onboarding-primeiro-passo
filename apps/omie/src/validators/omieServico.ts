import { z } from 'zod'

const allowedVigencias = [3, 6, 9, 12] as const

const servicoWebhookPayloadSchema = z.object({
  compra_id: z.string().uuid('compra_id deve ser um UUID válido'),
  evento: z.string().min(1, 'evento é obrigatório'),
  timestamp: z.string().min(1, 'timestamp é obrigatório'),
  dados: z.object({
    celebridade: z.string().min(1, 'celebridade é obrigatória'),
    uf: z
      .string()
      .length(2, 'uf deve ter 2 caracteres')
      .transform((v) => v.toUpperCase()),
    cidade: z.string().min(1, 'cidade é obrigatória'),
    segmento: z.string().min(1, 'segmento é obrigatório'),
    subsegmento: z.string().min(1, 'subsegmento é obrigatório'),
    vigencia: z
      .number()
      .int()
      .refine((v) => (allowedVigencias as readonly number[]).includes(v), {
        message: 'vigencia deve ser 3, 6, 9 ou 12',
      }),
    valor: z.number().int().positive('valor deve ser positivo'),
    cIdTrib: z.string().optional(),
    cCodServMun: z.string().optional(),
    cCodLC116: z.string().optional(),
    nIdNBS: z.string().optional(),
    cCodCateg: z.string().optional(),
  }),
})

export type ServicoWebhookPayload = z.infer<typeof servicoWebhookPayloadSchema>

export function validateServicoWebhookPayload(payload: unknown): {
  success: boolean
  data?: ServicoWebhookPayload
  errors?: { path: string; message: string }[]
} {
  const result = servicoWebhookPayloadSchema.safeParse(payload)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return { success: false, errors }
}
