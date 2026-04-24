/**
 * Edge Function: update-onboarding-copy
 *
 * Publishes updated onboarding copy to the singleton table and creates
 * a version history record. Protected by JWT + RBAC admin.
 *
 * Deploy protected, without --no-verify-jwt.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, corsHeaders } from '../_shared/cors.ts'
import { isRbacError, requireRole } from '../_shared/rbac.ts'

const CONFIG_TABLE = 'onboarding_copy'
const VERSIONS_TABLE = 'onboarding_copy_versions'

const VALID_ETAPA_KEYS = new Set([
  'ETAPA1',
  'ETAPA2',
  'ETAPA3',
  'ETAPA4',
  'ETAPA5',
  'ETAPA6',
  'ETAPA62',
  'ETAPA_FINAL',
])

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido', code: 'METHOD_NOT_ALLOWED' }, 405)
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authResult = await requireRole(req, ['admin'])
  if (isRbacError(authResult)) return authResult.error

  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json()
    const { content, changed_etapas, notes } = body
    const published_by = authResult.user.email || authResult.user.id

    // ── Validate ────────────────────────────────────────────────────────────
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return jsonResponse({ error: 'content deve ser um objeto', code: 'INVALID_CONTENT' }, 400)
    }

    const invalidKeys = Object.keys(content).filter((k) => !VALID_ETAPA_KEYS.has(k))
    if (invalidKeys.length > 0) {
      return jsonResponse({
        error: `Chaves inválidas no content: ${invalidKeys.join(', ')}`,
        code: 'INVALID_KEYS',
        valid_keys: [...VALID_ETAPA_KEYS],
      }, 400)
    }

    if (!published_by || typeof published_by !== 'string' || !published_by.trim()) {
      return jsonResponse({ error: 'published_by é obrigatório', code: 'MISSING_PUBLISHER' }, 400)
    }

    // ── DB ───────────────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch current singleton (including content to merge)
    const { data: existing, error: fetchError } = await supabase
      .from(CONFIG_TABLE)
      .select('id, version, content')
      .limit(1)
      .single()

    if (fetchError || !existing) {
      console.error('[update-onboarding-copy] Failed to fetch singleton:', fetchError)
      return jsonResponse({ error: 'Falha ao buscar configuração atual', code: 'DB_ERROR' }, 500)
    }

    const newVersion = (existing.version ?? 0) + 1
    const now = new Date().toISOString()

    // Merge: existing content + new diff (new keys override per-etapa, others preserved)
    const mergedContent = { ...(existing.content ?? {}), ...content }

    // Update singleton
    const { error: updateError } = await supabase
      .from(CONFIG_TABLE)
      .update({
        content: mergedContent,
        version: newVersion,
        published_by: published_by.trim(),
        updated_at: now,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('[update-onboarding-copy] Update failed:', updateError)
      return jsonResponse({ error: 'Falha ao atualizar copy', code: 'UPDATE_ERROR' }, 500)
    }

    // Insert version history
    const { error: versionError } = await supabase
      .from(VERSIONS_TABLE)
      .insert({
        version: newVersion,
        content,
        changed_etapas: Array.isArray(changed_etapas) ? changed_etapas : [],
        published_by: published_by.trim(),
        notes: notes?.trim() || null,
      })

    if (versionError) {
      console.error('[update-onboarding-copy] Version insert failed:', versionError)
      // Non-fatal: the main update succeeded, history is best-effort
    }

    console.log(`[update-onboarding-copy] Published v${newVersion} by ${published_by.trim()}`)

    return jsonResponse({
      success: true,
      version: newVersion,
      updated_at: now,
    })
  } catch (err) {
    console.error('[update-onboarding-copy] Error:', err)
    return jsonResponse({ success: false, code: 'INTERNAL_ERROR', message: String(err) }, 500)
  }
})
