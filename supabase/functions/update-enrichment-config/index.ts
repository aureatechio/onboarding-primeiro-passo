import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { CONFIG_TABLE, resetConfigCache } from '../_shared/enrichment/config.ts'
import { isRbacError, requireRole } from '../_shared/rbac.ts'

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validationError(message: string): Response {
  return json({ success: false, code: 'VALIDATION_ERROR', message }, 400)
}

function validateInt(val: unknown, min: number, max: number): number | null {
  const n = Number(val)
  if (Number.isNaN(n) || !Number.isInteger(n) || n < min || n > max) return null
  return n
}

function validateNumeric(val: unknown, min: number, max: number): number | null {
  const n = Number(val)
  if (Number.isNaN(n) || n < min || n > max) return null
  return n
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  try {
    const authResult = await requireRole(req, ['admin'])
    if (isRbacError(authResult)) return authResult.error

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ success: false, code: 'INVALID_JSON', message: 'JSON invalido.' }, 400)
    }

    const updateData: Record<string, unknown> = {}

    // --- String fields (prompts) ---
    for (const field of [
      'color_gemini_prompt',
      'font_validation_prompt',
      'font_suggestion_prompt',
    ]) {
      if (body[field] !== undefined) {
        const val = String(body[field]).trim()
        if (!val) return validationError(`${field} nao pode ser vazio.`)
        updateData[field] = val
      }
    }

    if (body['font_fallback'] !== undefined) {
      const val = String(body['font_fallback']).trim()
      if (!val) return validationError('font_fallback nao pode ser vazio.')
      updateData.font_fallback = val
    }

    if (body['briefing_auto_mode'] !== undefined) {
      const val = String(body['briefing_auto_mode']).trim()
      if (!['text', 'audio', 'both'].includes(val)) {
        return validationError('briefing_auto_mode deve ser text, audio ou both.')
      }
      updateData.briefing_auto_mode = val
    }

    if (body['gemini_model_name'] !== undefined) {
      const val = String(body['gemini_model_name']).trim()
      if (!val) return validationError('gemini_model_name nao pode ser vazio.')
      updateData.gemini_model_name = val
    }

    if (body['gemini_api_base_url'] !== undefined) {
      const val = String(body['gemini_api_base_url']).trim()
      if (!val.startsWith('https://')) {
        return validationError('gemini_api_base_url deve comecar com https://.')
      }
      updateData.gemini_api_base_url = val
    }

    if (body['scrape_user_agent'] !== undefined) {
      const val = String(body['scrape_user_agent']).trim()
      if (!val) return validationError('scrape_user_agent nao pode ser vazio.')
      updateData.scrape_user_agent = val
    }

    // --- Numeric fields ---
    if (body['gemini_temperature'] !== undefined) {
      const val = validateNumeric(body['gemini_temperature'], 0, 2)
      if (val === null) return validationError('gemini_temperature deve ser numero entre 0 e 2.')
      updateData.gemini_temperature = val
    }

    // --- Integer fields (timeouts) ---
    for (const field of [
      'timeout_colors_ms',
      'timeout_font_ms',
      'timeout_briefing_ms',
      'timeout_campaign_ms',
    ]) {
      if (body[field] !== undefined) {
        const val = validateInt(body[field], 1000, 120000)
        if (val === null) {
          return validationError(`${field} deve ser inteiro entre 1000 e 120000.`)
        }
        updateData[field] = val
      }
    }

    if (body['color_extraction_max'] !== undefined) {
      const val = validateInt(body['color_extraction_max'], 1, 10)
      if (val === null) {
        return validationError('color_extraction_max deve ser inteiro entre 1 e 10.')
      }
      updateData.color_extraction_max = val
    }

    if (body['retry_gemini_max'] !== undefined) {
      const val = validateInt(body['retry_gemini_max'], 0, 10)
      if (val === null) {
        return validationError('retry_gemini_max deve ser inteiro entre 0 e 10.')
      }
      updateData.retry_gemini_max = val
    }

    if (body['retry_scrape_max'] !== undefined) {
      const val = validateInt(body['retry_scrape_max'], 0, 10)
      if (val === null) {
        return validationError('retry_scrape_max deve ser inteiro entre 0 e 10.')
      }
      updateData.retry_scrape_max = val
    }

    if (body['scrape_timeout_ms'] !== undefined) {
      const val = validateInt(body['scrape_timeout_ms'], 1000, 30000)
      if (val === null) {
        return validationError('scrape_timeout_ms deve ser inteiro entre 1000 e 30000.')
      }
      updateData.scrape_timeout_ms = val
    }

    // --- Backoff strings ---
    for (const field of ['retry_gemini_backoff_ms', 'retry_scrape_backoff_ms']) {
      if (body[field] !== undefined) {
        const val = String(body[field]).trim()
        const parts = val.split(',').map((s) => parseInt(s.trim(), 10))
        if (parts.length === 0 || parts.some((n) => Number.isNaN(n) || n < 0)) {
          return validationError(`${field} deve ser lista de inteiros separados por virgula.`)
        }
        updateData[field] = val
      }
    }

    // --- Array field (color_fallback_palette) ---
    if (body['color_fallback_palette'] !== undefined) {
      const palette = body['color_fallback_palette']
      if (!Array.isArray(palette) || palette.length === 0) {
        return validationError('color_fallback_palette deve ser array nao-vazio de hex colors.')
      }
      const hexColors = palette.map(String)
      if (!hexColors.every((c) => HEX_COLOR_RE.test(c))) {
        return validationError('color_fallback_palette deve conter apenas cores hex validas (#RRGGBB).')
      }
      updateData.color_fallback_palette = hexColors
    }

    if (Object.keys(updateData).length === 0) {
      return json(
        { success: false, code: 'NO_VALID_FIELDS', message: 'Nenhum campo valido para atualizar.' },
        400,
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: existing, error: fetchErr } = await supabase
      .from(CONFIG_TABLE)
      .select('id')
      .limit(1)
      .single()

    if (fetchErr || !existing?.id) {
      console.error('[update-enrichment-config] fetch error:', fetchErr)
      return json(
        { success: false, code: 'NOT_FOUND', message: 'Configuracao nao encontrada.' },
        404,
      )
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updated, error: updateErr } = await supabase
      .from(CONFIG_TABLE)
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (updateErr) {
      console.error('[update-enrichment-config] update error:', updateErr)
      return json(
        { success: false, code: 'DB_ERROR', message: 'Erro ao atualizar configuracao.' },
        500,
      )
    }

    resetConfigCache()

    return json({ success: true, config: updated })
  } catch (err) {
    console.error('[update-enrichment-config] unexpected error:', err)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
})
