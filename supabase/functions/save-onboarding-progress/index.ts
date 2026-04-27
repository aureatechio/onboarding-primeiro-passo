import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_STEPS = ['1', '2', '3', '4', '5', '6', '7', 'final'] as const
const VALID_TRAFFIC_CHOICES = ['yes', 'no'] as const
const MAX_ACCEPTANCES = 12
const MAX_ITEM_KEY_LENGTH = 120
const MAX_ITEM_TEXT_LENGTH = 2000
const MAX_COPY_SOURCE_LENGTH = 80
const MAX_METADATA_JSON_LENGTH = 4000

const STEP_COLUMN_MAP: Record<string, string> = {
  '1': 'step1_completed_at',
  '2': 'step2_completed_at',
  '3': 'step3_completed_at',
  '4': 'step4_completed_at',
  '5': 'step5_completed_at',
  '6': 'step6_completed_at',
  '7': 'step7_completed_at',
  final: 'step_final_completed_at',
}

const STEP_KEY_MAP: Record<string, string> = {
  '1': 'etapa1',
  '2': 'etapa2',
  '3': 'etapa3',
  '4': 'etapa4',
  '5': 'etapa5',
  '6': 'etapa6_1',
  '7': 'etapa6_2',
  final: 'etapa_final',
}

const ACCEPTANCE_KEYS_BY_STEP: Record<string, Set<string>> = {
  '2': new Set([
    'etapa2.responsabilidade_divulgacao',
    'etapa2.gravacoes_pre_realizadas',
    'etapa2.pacote_contratado',
  ]),
  '3': new Set([
    'etapa3.prazo_contrato_agilidade',
    'etapa3.preparacao_15_dias',
    'etapa3.atrasos_reduzem_tempo',
  ]),
  '4': new Set([
    'etapa4.exclusividade_praca_segmento',
    'etapa4.aprovacao_celebridade_ajustes',
    'etapa4.nao_marcar_whatsapp_email',
    'etapa4.excluir_pecas_fim_contrato',
    'etapa4.multa_uso_indevido',
  ]),
  '6': new Set([
    'etapa6_1.identidade_visual_materiais',
  ]),
}

type AcceptanceInput = {
  item_key: string
  item_text: string
  accepted: boolean
  copy_source: string
  metadata: Record<string, unknown>
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validationError(code: string, message: string, status = 400): Response {
  return json({ success: false, code, message }, status)
}

function validateAcceptances(raw: unknown, step: string): { ok: true; value: AcceptanceInput[] } | { ok: false; response: Response } {
  if (raw === undefined || raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw)) {
    return { ok: false, response: validationError('INVALID_ACCEPTANCES', 'acceptances deve ser array.') }
  }
  if (raw.length > MAX_ACCEPTANCES) {
    return { ok: false, response: validationError('TOO_MANY_ACCEPTANCES', `Maximo ${MAX_ACCEPTANCES} aceites por etapa.`) }
  }

  const allowedKeys = ACCEPTANCE_KEYS_BY_STEP[step]
  if (raw.length > 0 && !allowedKeys) {
    return { ok: false, response: validationError('ACCEPTANCES_NOT_ALLOWED', `Etapa ${step} nao aceita acceptances.`) }
  }

  const acceptances: AcceptanceInput[] = []
  for (const [index, item] of raw.entries()) {
    if (!isPlainObject(item)) {
      return { ok: false, response: validationError('INVALID_ACCEPTANCE', `acceptances[${index}] deve ser objeto.`) }
    }

    const itemKey = String(item.item_key ?? '').trim()
    const itemText = String(item.item_text ?? '').trim()
    const acceptedRaw = item.accepted
    const copySource = String(item.copy_source ?? 'copy.js').trim() || 'copy.js'
    const metadataRaw = item.metadata ?? {}

    if (!itemKey || itemKey.length > MAX_ITEM_KEY_LENGTH) {
      return { ok: false, response: validationError('INVALID_ITEM_KEY', `acceptances[${index}].item_key invalido.`) }
    }
    if (!allowedKeys?.has(itemKey)) {
      return { ok: false, response: validationError('ITEM_KEY_NOT_ALLOWED', `item_key nao permitido para etapa ${step}: ${itemKey}`) }
    }
    if (!itemText || itemText.length > MAX_ITEM_TEXT_LENGTH) {
      return { ok: false, response: validationError('INVALID_ITEM_TEXT', `acceptances[${index}].item_text deve ter 1-${MAX_ITEM_TEXT_LENGTH} caracteres.`) }
    }
    if (acceptedRaw !== undefined && typeof acceptedRaw !== 'boolean') {
      return { ok: false, response: validationError('INVALID_ACCEPTED', `acceptances[${index}].accepted deve ser boolean.`) }
    }
    if (copySource.length > MAX_COPY_SOURCE_LENGTH) {
      return { ok: false, response: validationError('INVALID_COPY_SOURCE', `acceptances[${index}].copy_source excede ${MAX_COPY_SOURCE_LENGTH} caracteres.`) }
    }
    if (!isPlainObject(metadataRaw)) {
      return { ok: false, response: validationError('INVALID_METADATA', `acceptances[${index}].metadata deve ser objeto.`) }
    }
    if (JSON.stringify(metadataRaw).length > MAX_METADATA_JSON_LENGTH) {
      return { ok: false, response: validationError('METADATA_TOO_LARGE', `acceptances[${index}].metadata excede ${MAX_METADATA_JSON_LENGTH} bytes.`) }
    }

    acceptances.push({
      item_key: itemKey,
      item_text: itemText,
      accepted: acceptedRaw === undefined ? true : acceptedRaw,
      copy_source: copySource,
      metadata: metadataRaw,
    })
  }

  return { ok: true, value: acceptances }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  try {
    const body = await req.json()
    const compraId = String(body.compra_id ?? '').trim()
    const step = String(body.step ?? '').trim()
    const currentStep = String(body.current_step ?? '').trim()
    const trafficChoice = body.traffic_choice ? String(body.traffic_choice).trim() : null

    // --- Validation ---
    if (!compraId || !UUID_REGEX.test(compraId)) {
      return json(
        { success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id must be a valid UUID.' },
        400
      )
    }

    if (!step || !VALID_STEPS.includes(step as typeof VALID_STEPS[number])) {
      return json(
        { success: false, code: 'INVALID_STEP', message: `step must be one of: ${VALID_STEPS.join(', ')}` },
        400
      )
    }

    if (!currentStep) {
      return json(
        { success: false, code: 'INVALID_CURRENT_STEP', message: 'current_step is required.' },
        400
      )
    }

    if (trafficChoice && !VALID_TRAFFIC_CHOICES.includes(trafficChoice as typeof VALID_TRAFFIC_CHOICES[number])) {
      return json(
        { success: false, code: 'INVALID_TRAFFIC_CHOICE', message: 'traffic_choice must be yes or no.' },
        400
      )
    }

    const acceptancesCheck = validateAcceptances(body.acceptances, step)
    if (!acceptancesCheck.ok) return acceptancesCheck.response
    const acceptances = acceptancesCheck.value

    // --- Supabase client ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const stepColumn = STEP_COLUMN_MAP[step]
    const now = new Date().toISOString()

    // Check if row already exists (to preserve existing timestamps)
    const { data: existing } = await supabase
      .from('onboarding_progress')
      .select('id, step1_completed_at, step2_completed_at, step3_completed_at, step4_completed_at, step5_completed_at, step6_completed_at, step7_completed_at, step_final_completed_at, completed_at')
      .eq('compra_id', compraId)
      .maybeSingle()
    const existingProgress = existing as Record<string, unknown> | null

    const upsertData: Record<string, unknown> = {
      compra_id: compraId,
      current_step: currentStep,
      updated_at: now,
    }

    // Only set step timestamp if not already set (idempotent)
    if (!existingProgress || !existingProgress[stepColumn]) {
      upsertData[stepColumn] = now
    }

    if (trafficChoice) {
      upsertData.traffic_choice = trafficChoice
    }

    if (step === 'final') {
      // Only set completed_at if not already set
      if (!existingProgress?.completed_at) {
        upsertData.completed_at = now
      }
    }

    const { error } = await supabase
      .from('onboarding_progress')
      .upsert(upsertData, { onConflict: 'compra_id' })

    if (error) {
      console.error('[save-onboarding-progress] upsert error:', error)

      if (error.code === '23503') {
        return json(
          { success: false, code: 'COMPRA_NOT_FOUND', message: 'compra_id does not exist.' },
          404
        )
      }

      return json(
        { success: false, code: 'DB_ERROR', message: 'Failed to save progress.' },
        500
      )
    }

    if (acceptances.length > 0) {
      const stepKey = STEP_KEY_MAP[step]
      const acceptanceRows = []
      for (const item of acceptances) {
        const itemHash = await sha256Hex(`${item.item_key}\n${item.item_text}`)
        acceptanceRows.push({
          compra_id: compraId,
          step_key: stepKey,
          item_key: item.item_key,
          item_text: item.item_text,
          item_hash: itemHash,
          accepted: item.accepted,
          accepted_at: now,
          copy_source: item.copy_source,
          metadata: item.metadata,
          updated_at: now,
        })
      }

      const { error: acceptancesError } = await supabase
        .from('onboarding_acceptances')
        .upsert(acceptanceRows, {
          onConflict: 'compra_id,item_key,item_hash',
          ignoreDuplicates: true,
        })

      if (acceptancesError) {
        console.error('[save-onboarding-progress] acceptances upsert error:', acceptancesError)
        return json(
          { success: false, code: 'ACCEPTANCES_DB_ERROR', message: 'Failed to save acceptances.' },
          500
        )
      }
    }

    return json({ success: true, data: { acceptances_count: acceptances.length } })
  } catch (err) {
    console.error('[save-onboarding-progress] unexpected error:', err)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Internal server error.' }, 500)
  }
})
