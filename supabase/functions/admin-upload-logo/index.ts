// admin-upload-logo (ONB-23)
// Upload de logo novo + registro em onboarding_logo_history (is_active=true).
// Auth: JWT obrigatorio. Deploy SEM --no-verify-jwt.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { isAuthError, requireAuth } from '../_shared/auth.ts'
import {
  getFileExtension,
  validateLogoFile,
  validateUuid,
} from '../_shared/onboarding-validation.ts'

const BUCKET = 'onboarding-identity'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function genUuid(): string {
  // @ts-ignore Deno runtime
  return crypto.randomUUID()
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = await requireAuth(req)
  if (isAuthError(authResult)) return authResult.error
  const { user, serviceClient } = authResult

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return json({
      success: false,
      code: 'INVALID_CONTENT_TYPE',
      message: 'Use multipart/form-data com campos compra_id e file.',
    }, 400)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return json({ success: false, code: 'INVALID_FORM', message: 'FormData invalido.' }, 400)
  }

  const compraIdRaw = String(formData.get('compra_id') ?? '').trim()
  const compraIdCheck = validateUuid(compraIdRaw, 'compra_id')
  if (!compraIdCheck.ok) return json({ success: false, ...compraIdCheck.error }, 400)
  const compraId = compraIdCheck.value

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return json({ success: false, code: 'FILE_REQUIRED', message: 'Campo file obrigatorio.' }, 400)
  }

  const fileCheck = validateLogoFile(file)
  if (!fileCheck.ok) return json({ success: false, ...fileCheck.error }, 400)

  const ext = getFileExtension(file)
  const uuid = genUuid()
  const path = `${compraId}/logos/${uuid}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return json({ success: false, code: 'STORAGE_ERROR', message: uploadError.message }, 500)
  }

  // Desativa registros atuais da mesma compra (liberando unique index parcial)
  const { error: deactivateError } = await serviceClient
    .from('onboarding_logo_history')
    .update({ is_active: false })
    .eq('compra_id', compraId)
    .eq('is_active', true)

  if (deactivateError) {
    await serviceClient.storage.from(BUCKET).remove([path])
    return json({ success: false, code: 'DB_ERROR', message: deactivateError.message }, 500)
  }

  const { data: historyRow, error: insertError } = await serviceClient
    .from('onboarding_logo_history')
    .insert({
      compra_id: compraId,
      logo_path: path,
      original_filename: file.name || null,
      mime_type: file.type || null,
      size_bytes: file.size || null,
      uploaded_by_user_id: user.id,
      is_active: true,
    })
    .select('id, compra_id, logo_path, original_filename, mime_type, size_bytes, uploaded_at, uploaded_by_user_id, is_active')
    .single()

  if (insertError) {
    await serviceClient.storage.from(BUCKET).remove([path])
    return json({ success: false, code: 'DB_ERROR', message: insertError.message }, 500)
  }

  // Atualiza ponteiro em onboarding_identity (upsert para cobrir caso raro de identity ausente)
  const { error: identityError } = await serviceClient
    .from('onboarding_identity')
    .update({ logo_path: path, updated_at: new Date().toISOString() })
    .eq('compra_id', compraId)

  if (identityError) {
    return json({
      success: false,
      code: 'IDENTITY_UPDATE_FAILED',
      message: identityError.message,
    }, 500)
  }

  const { data: signed } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(path, 604800)

  return json({
    success: true,
    history_entry: { ...historyRow, logo_url: signed?.signedUrl ?? null },
  })
})
