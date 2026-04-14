import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_STEPS = ['1', '2', '3', '4', '5', '6', '7', 'final'] as const
const VALID_TRAFFIC_CHOICES = ['yes', 'no'] as const

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

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

    // --- Supabase client ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const stepColumn = STEP_COLUMN_MAP[step]
    const now = new Date().toISOString()

    // Check if row already exists (to preserve existing timestamps)
    const { data: existing } = await supabase
      .from('onboarding_progress')
      .select(`id, ${stepColumn}, completed_at`)
      .eq('compra_id', compraId)
      .maybeSingle()

    const upsertData: Record<string, unknown> = {
      compra_id: compraId,
      current_step: currentStep,
      updated_at: now,
    }

    // Only set step timestamp if not already set (idempotent)
    if (!existing || !existing[stepColumn]) {
      upsertData[stepColumn] = now
    }

    if (trafficChoice) {
      upsertData.traffic_choice = trafficChoice
    }

    if (step === 'final') {
      // Only set completed_at if not already set
      if (!existing?.completed_at) {
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

    return json({ success: true })
  } catch (err) {
    console.error('[save-onboarding-progress] unexpected error:', err)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Internal server error.' }, 500)
  }
})
