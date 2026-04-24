// admin-update-onboarding-identity (ONB-23)
// Atualiza campos editaveis do onboarding_identity a partir do painel admin.
// Auth: JWT obrigatorio + RBAC admin. Deploy sem --no-verify-jwt.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { isRbacError, requireRole } from '../_shared/rbac.ts'
import {
  validateBrandDisplayName,
  validateBrandPalette,
  validateCampaignNotes,
  validateInstagramHandle,
  validateSiteUrl,
  validateUuid,
} from '../_shared/onboarding-validation.ts'

type Changes = {
  brand_display_name?: string | null
  instagram_handle?: string | null
  site_url?: string | null
  campaign_notes?: string | null
  brand_palette?: string[] | null
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

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST ou PATCH.' }, 405)
  }

  const authResult = await requireRole(req, ['admin'])
  if (isRbacError(authResult)) return authResult.error
  const { user, serviceClient } = authResult

  let body: { compra_id?: string; changes?: Changes; reenrich?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'Body JSON invalido.' }, 400)
  }

  const compraIdCheck = validateUuid(body.compra_id ?? '', 'compra_id')
  if (!compraIdCheck.ok) return json({ success: false, ...compraIdCheck.error }, 400)
  const compraId = compraIdCheck.value

  const changes = body.changes || {}
  const update: Record<string, unknown> = {}

  if (changes.brand_display_name !== undefined) {
    if (changes.brand_display_name === null || changes.brand_display_name === '') {
      update.brand_display_name = null
    } else {
      const v = validateBrandDisplayName(changes.brand_display_name)
      if (!v.ok) return json({ success: false, ...v.error }, 400)
      update.brand_display_name = v.value
    }
  }

  let siteOrHandleChanged = false

  if (changes.instagram_handle !== undefined) {
    if (changes.instagram_handle === null || changes.instagram_handle === '') {
      update.instagram_handle = null
    } else {
      const v = validateInstagramHandle(changes.instagram_handle)
      if (!v.ok) return json({ success: false, ...v.error }, 400)
      update.instagram_handle = v.value || null
    }
    siteOrHandleChanged = true
  }

  if (changes.site_url !== undefined) {
    if (changes.site_url === null || changes.site_url === '') {
      update.site_url = null
    } else {
      const v = validateSiteUrl(changes.site_url)
      if (!v.ok) return json({ success: false, ...v.error }, 400)
      update.site_url = v.value || null
    }
    siteOrHandleChanged = true
  }

  if (changes.campaign_notes !== undefined) {
    if (changes.campaign_notes === null) {
      update.campaign_notes = null
    } else {
      const v = validateCampaignNotes(changes.campaign_notes)
      if (!v.ok) return json({ success: false, ...v.error }, 400)
      update.campaign_notes = v.value || null
    }
  }

  if (changes.brand_palette !== undefined) {
    if (changes.brand_palette === null) {
      update.brand_palette = []
    } else {
      const v = validateBrandPalette(changes.brand_palette)
      if (!v.ok) return json({ success: false, ...v.error }, 400)
      update.brand_palette = v.value
    }
  }

  if (Object.keys(update).length === 0) {
    return json({ success: false, code: 'NO_CHANGES', message: 'Nenhum campo informado.' }, 400)
  }

  update.updated_at = new Date().toISOString()

  const { data, error } = await serviceClient
    .from('onboarding_identity')
    .update(update)
    .eq('compra_id', compraId)
    .select(
      'id, choice, brand_display_name, instagram_handle, site_url, brand_palette, campaign_notes, production_path, updated_at',
    )
    .maybeSingle()

  if (error) {
    return json({ success: false, code: 'DB_ERROR', message: error.message }, 500)
  }
  if (!data) {
    return json({ success: false, code: 'NOT_FOUND', message: 'onboarding_identity nao encontrado.' }, 404)
  }

  // Opt-in re-enrich se site/instagram mudaram
  let reenrichTriggered = false
  if (body.reenrich === true && siteOrHandleChanged) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      if (supabaseUrl && serviceRoleKey) {
        await fetch(`${supabaseUrl}/functions/v1/onboarding-enrichment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ compra_id: compraId }),
        })
        reenrichTriggered = true
      }
    } catch (_) {
      // nao bloqueia sucesso; UI pode tentar de novo
    }
  }

  return json({
    success: true,
    identity: data,
    reenrich_triggered: reenrichTriggered,
    updated_by: user.id,
  })
})
