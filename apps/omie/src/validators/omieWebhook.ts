import { z } from 'zod'

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const cnpjSchema = z
  .string()
  .min(1, 'CNPJ é obrigatório')
  .refine((value) => digitsOnly(value).length === 14, {
    message: 'CNPJ deve ter 14 dígitos',
  })

const cepSchema = z
  .string()
  .min(1, 'CEP é obrigatório')
  .refine((value) => digitsOnly(value).length === 8, {
    message: 'CEP deve ter 8 dígitos',
  })

const idSchema = z.union([z.string().min(1, 'ID é obrigatório'), z.number().int()])

const enderecoSchema = z.object({
  logradouro: z.string().min(1, 'logradouro é obrigatório'),
  numero: z.string().min(1, 'numero é obrigatório'),
  bairro: z.string().min(1, 'bairro é obrigatório'),
  cidade: z.string().min(1, 'cidade é obrigatório'),
  estado: z.string().min(2, 'estado é obrigatório'),
  cep: cepSchema,
  complemento: z.string().optional(),
})

const celebridadeSchema = z.object({
  id: idSchema,
  nome: z.string().min(1, 'celebridade.nome é obrigatório'),
})

const regiaoSchema = z.object({
  id: idSchema,
  nome: z.string().min(1, 'regiao.nome é obrigatório'),
})

const vendedorSchema = z
  .object({
    id: idSchema,
    nome: z.string().min(1, 'vendedor.nome é obrigatório'),
    tem_agencia: z.boolean(),
    agencia: z
      .object({
        id: idSchema,
        nome: z.string().min(1, 'agencia.nome é obrigatório'),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tem_agencia && !value.agencia) {
      ctx.addIssue({
        code: 'custom',
        path: ['agencia'],
        message: 'Agência é obrigatória quando tem_agencia=true',
      })
    }
  })

const clienteSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  cnpj: cnpjSchema,
  email: z.string().email('email inválido').optional(),
  endereco: enderecoSchema,
  celebridade: celebridadeSchema,
  regiao: regiaoSchema,
  vendedor: vendedorSchema,
})

const webhookPayloadSchema = z.object({
  compra_id: z.string().uuid('compra_id deve ser um UUID válido'),
  evento: z.string().min(1, 'evento é obrigatório'),
  timestamp: z.string().min(1, 'timestamp é obrigatório'),
  dados: z.object({
    cliente: clienteSchema,
  }),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>

export function validateWebhookPayload(payload: unknown): {
  success: boolean
  data?: WebhookPayload
  errors?: { path: string; message: string }[]
} {
  const result = webhookPayloadSchema.safeParse(payload)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return { success: false, errors }
}
