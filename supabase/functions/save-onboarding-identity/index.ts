import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_LOGO_SIZE = 5 * 1024 * 1024
const MAX_PALETTE_COLORS = 8
const MAX_FONT_LENGTH = 100
const MAX_NOTES_LENGTH = 2000
const MAX_URL_LENGTH = 500
const MAX_HANDLE_LENGTH = 30
const INSTAGRAM_HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/
const MAX_CAMPAIGN_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp',
  'image/heic', 'image/heif', 'application/pdf',
]
const BUCKET_NAME = 'onboarding-identity'
const VALID_CHOICES = ['add_now', 'later']
const VALID_PRODUCTION_PATHS = ['standard', 'hybrid']

async function triggerEnrichmentPipeline(compraId: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[save-onboarding-identity] missing env for enrichment trigger')
    return
  }

  const endpoint = `${supabaseUrl}/functions/v1/onboarding-enrichment`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ compra_id: compraId }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`onboarding-enrichment HTTP ${response.status}: ${body.substring(0, 200)}`)
  }

  const data = await response.json()
  console.log('[save-onboarding-identity] enrichment trigger response:', {
    success: data?.success ?? false,
    status: data?.status ?? null,
    job_id: data?.job_id ?? null,
  })
}

// Legacy trigger — kept as documented fallback. Uncomment to bypass enrichment pipeline.
// async function triggerAiCampaignJob(compraId: string): Promise<void> {
//   const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
//   const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
//   if (!supabaseUrl || !serviceRoleKey) return
//   const endpoint = `${supabaseUrl}/functions/v1/create-ai-campaign-job`
//   await fetch(endpoint, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
//     body: JSON.stringify({ compra_id: compraId }),
//   })
// }

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getFileExtension(file: File): string {
  const name = file.name || ''
  const dotIdx = name.lastIndexOf('.')
  if (dotIdx > 0) return name.slice(dotIdx + 1).toLowerCase()
  const mime = file.type || ''
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('heic')) return 'heic'
  if (mime.includes('heif')) return 'heif'
  return 'jpg'
}

function genUuid(): string {
  return crypto.randomUUID()
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    let compraId = ''
    let choice = ''
    let logoFile: File | null = null
    let brandPalette: string[] = []
    let fontChoice = ''
    let campaignNotes = ''
    let productionPath: string | null = null
    let siteUrl = ''
    let instagramHandle = ''
    const campaignImages: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      compraId = (formData.get('compra_id') as string)?.trim() ?? ''
      choice = (formData.get('choice') as string)?.trim() ?? ''
      fontChoice = (formData.get('font_choice') as string)?.trim() ?? ''
      campaignNotes = (formData.get('campaign_notes') as string)?.trim() ?? ''
      siteUrl = (formData.get('site_url') as string)?.trim() ?? ''
      instagramHandle = (formData.get('instagram_handle') as string)?.trim().replace(/^@/, '') ?? ''
      const prodPath = (formData.get('production_path') as string)?.trim() ?? ''
      if (prodPath && VALID_PRODUCTION_PATHS.includes(prodPath)) {
        productionPath = prodPath
      }

      const paletteRaw = formData.get('brand_palette') as string
      if (paletteRaw) {
        try {
          const parsed = JSON.parse(paletteRaw)
          if (Array.isArray(parsed)) brandPalette = parsed.map(String)
        } catch { /* ignore */ }
      }

      logoFile = formData.get('logo') as File | null
      if (logoFile && !(logoFile instanceof File && logoFile.size > 0)) logoFile = null

      for (const entry of formData.getAll('campaign_images')) {
        if (entry instanceof File && entry.size > 0) {
          campaignImages.push(entry)
        }
      }
    } else {
      const body = await req.json()
      compraId = (body.compra_id ?? '').trim()
      choice = (body.choice ?? '').trim()
      fontChoice = (body.font_choice ?? '').trim()
      campaignNotes = (body.campaign_notes ?? '').trim()
      siteUrl = (body.site_url ?? '').trim()
      instagramHandle = (body.instagram_handle ?? '').trim().replace(/^@/, '')
      if (body.brand_palette && Array.isArray(body.brand_palette)) {
        brandPalette = body.brand_palette.map(String)
      }
      if (body.production_path && VALID_PRODUCTION_PATHS.includes(body.production_path)) {
        productionPath = body.production_path
      }
    }

    if (!compraId || !UUID_REGEX.test(compraId)) {
      return json({ success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id invalido.' }, 400)
    }
    if (!VALID_CHOICES.includes(choice)) {
      return json({ success: false, code: 'INVALID_CHOICE', message: 'choice deve ser add_now ou later.' }, 400)
    }

    if (choice === 'add_now') {
      if (logoFile) {
        if (logoFile.size > MAX_LOGO_SIZE) {
          return json({ success: false, code: 'LOGO_TOO_LARGE', message: 'Logo excede 5 MB.' }, 400)
        }
        if (!ALLOWED_IMAGE_TYPES.some((t) => logoFile!.type.startsWith(t))) {
          const ext = getFileExtension(logoFile!)
          if (!['heic', 'heif'].includes(ext)) {
            return json({ success: false, code: 'INVALID_LOGO_TYPE', message: 'Formato de logo nao suportado (use PNG, JPG, PDF, WebP, SVG, HEIC ou HEIF).' }, 400)
          }
        }
      }
      if (brandPalette.length > MAX_PALETTE_COLORS) {
        return json({ success: false, code: 'TOO_MANY_COLORS', message: `Maximo ${MAX_PALETTE_COLORS} cores.` }, 400)
      }
      if (fontChoice.length > MAX_FONT_LENGTH) {
        return json({ success: false, code: 'FONT_TOO_LONG', message: `Font choice excede ${MAX_FONT_LENGTH} chars.` }, 400)
      }
      if (campaignNotes.length > MAX_NOTES_LENGTH) {
        return json({ success: false, code: 'NOTES_TOO_LONG', message: `Notas excedem ${MAX_NOTES_LENGTH} chars.` }, 400)
      }
      if (siteUrl && siteUrl.length > MAX_URL_LENGTH) {
        return json({ success: false, code: 'URL_TOO_LONG', message: `site_url excede ${MAX_URL_LENGTH} chars.` }, 400)
      }
      if (siteUrl && !siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
        return json({ success: false, code: 'INVALID_URL', message: 'site_url deve comecar com http:// ou https://.' }, 400)
      }
      if (instagramHandle && !INSTAGRAM_HANDLE_RE.test(instagramHandle)) {
        return json({ success: false, code: 'INVALID_HANDLE', message: 'instagram_handle invalido (alfanumerico, . e _, max 30 chars).' }, 400)
      }
      if (campaignImages.length > MAX_CAMPAIGN_IMAGES) {
        return json({ success: false, code: 'TOO_MANY_IMAGES', message: `Maximo ${MAX_CAMPAIGN_IMAGES} imagens.` }, 400)
      }
      for (const img of campaignImages) {
        if (img.size > MAX_IMAGE_SIZE) {
          return json({ success: false, code: 'IMAGE_TOO_LARGE', message: `Imagem "${img.name}" excede 5 MB.` }, 400)
        }
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let logoPath: string | null = null
    let logoHistoryId: string | null = null
    let logoOriginalFilename: string | null = null
    let logoMimeType: string | null = null
    let logoSizeBytes: number | null = null
    let previousActiveLogoId: string | null = null
    const imagesPaths: string[] = []

    if (choice === 'add_now' && logoFile) {
      const ext = getFileExtension(logoFile)
      const filePath = `${compraId}/logos/${genUuid()}.${ext}`

      const { data: previousActiveLogo, error: previousActiveLogoError } = await supabase
        .from('onboarding_logo_history')
        .select('id')
        .eq('compra_id', compraId)
        .eq('is_active', true)
        .maybeSingle()

      if (previousActiveLogoError) {
        console.error('[save-onboarding-identity] logo history lookup error:', previousActiveLogoError)
        return json({ success: false, code: 'LOGO_HISTORY_ERROR', message: 'Falha ao consultar historico de logos.' }, 500)
      }
      previousActiveLogoId = previousActiveLogo?.id ?? null

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('[save-onboarding-identity] logo upload error:', uploadError)
        return json({ success: false, code: 'UPLOAD_ERROR', message: 'Falha no upload do logo.' }, 500)
      }

      const { data: historyRow, error: historyError } = await supabase
        .from('onboarding_logo_history')
        .insert({
          compra_id: compraId,
          logo_path: filePath,
          original_filename: logoFile.name || null,
          mime_type: logoFile.type || null,
          size_bytes: logoFile.size || null,
          uploaded_by_user_id: null,
          is_active: false,
          source: 'public_onboarding',
        })
        .select('id')
        .single()

      if (historyError) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
        console.error('[save-onboarding-identity] logo history insert error:', historyError)
        return json({ success: false, code: 'LOGO_HISTORY_ERROR', message: 'Falha ao registrar historico do logo.' }, 500)
      }

      const { error: deactivateError } = await supabase
        .from('onboarding_logo_history')
        .update({ is_active: false })
        .eq('compra_id', compraId)
        .eq('is_active', true)

      if (deactivateError) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
        await supabase.from('onboarding_logo_history').delete().eq('id', historyRow.id)
        console.error('[save-onboarding-identity] logo history deactivate error:', deactivateError)
        return json({ success: false, code: 'LOGO_HISTORY_ERROR', message: 'Falha ao atualizar historico de logos.' }, 500)
      }

      const { error: activateError } = await supabase
        .from('onboarding_logo_history')
        .update({ is_active: true })
        .eq('id', historyRow.id)

      if (activateError) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
        await supabase.from('onboarding_logo_history').delete().eq('id', historyRow.id)
        if (previousActiveLogoId) {
          await supabase
            .from('onboarding_logo_history')
            .update({ is_active: true })
            .eq('id', previousActiveLogoId)
        }
        console.error('[save-onboarding-identity] logo history activate error:', activateError)
        return json({ success: false, code: 'LOGO_HISTORY_ERROR', message: 'Falha ao ativar historico do logo.' }, 500)
      }

      logoPath = filePath
      logoHistoryId = historyRow.id
      logoOriginalFilename = logoFile.name || null
      logoMimeType = logoFile.type || null
      logoSizeBytes = logoFile.size || null
    }

    if (choice === 'add_now' && campaignImages.length > 0) {
      for (let i = 0; i < campaignImages.length; i++) {
        const img = campaignImages[i]
        const ext = getFileExtension(img)
        const filePath = `${compraId}/img_${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, img, {
            contentType: img.type,
            upsert: true,
          })

        if (uploadError) {
          console.error(`[save-onboarding-identity] image ${i} upload error:`, uploadError)
          continue
        }
        imagesPaths.push(filePath)
      }
    }

    const upsertData: Record<string, unknown> = {
      compra_id: compraId,
      choice,
      updated_at: new Date().toISOString(),
    }

    if (logoPath !== null) upsertData.logo_path = logoPath
    if (brandPalette.length > 0) upsertData.brand_palette = brandPalette
    if (fontChoice) upsertData.font_choice = fontChoice
    if (imagesPaths.length > 0) upsertData.campaign_images_paths = imagesPaths
    if (campaignNotes) upsertData.campaign_notes = campaignNotes
    if (siteUrl) upsertData.site_url = siteUrl
    if (instagramHandle) upsertData.instagram_handle = instagramHandle
    if (siteUrl || instagramHandle) {
      upsertData.production_path = 'standard'
    } else if (productionPath !== null) {
      upsertData.production_path = productionPath
    }

    const { data, error } = await supabase
      .from('onboarding_identity')
      .upsert(upsertData, { onConflict: 'compra_id' })
      .select('id')
      .single()

    if (error) {
      console.error('[save-onboarding-identity] db error:', error)
      if (logoHistoryId && logoPath) {
        await supabase.from('onboarding_logo_history').delete().eq('id', logoHistoryId)
        if (previousActiveLogoId) {
          await supabase
            .from('onboarding_logo_history')
            .update({ is_active: true })
            .eq('id', previousActiveLogoId)
        }
        await supabase.storage.from(BUCKET_NAME).remove([logoPath])
      }
      return json({ success: false, code: 'DB_ERROR', message: 'Falha ao salvar identidade visual.' }, 500)
    }

    const { data: submission, error: submissionError } = await supabase
      .from('onboarding_identity_submissions')
      .insert({
        compra_id: compraId,
        identity_id: data.id,
        logo_history_id: logoHistoryId,
        source: 'public_onboarding',
        choice,
        site_url: siteUrl || null,
        instagram_handle: instagramHandle || null,
        campaign_notes: campaignNotes || null,
        brand_palette: brandPalette,
        production_path: (upsertData.production_path as string | undefined) ?? productionPath,
        logo_path: logoPath,
        logo_original_filename: logoOriginalFilename,
        logo_mime_type: logoMimeType,
        logo_size_bytes: logoSizeBytes,
        metadata: {
          campaign_images_count: imagesPaths.length,
          campaign_images_paths: imagesPaths,
        },
      })
      .select('id')
      .single()

    if (submissionError) {
      console.error('[save-onboarding-identity] submission audit error:', submissionError)
      return json({ success: false, code: 'SUBMISSION_AUDIT_ERROR', message: 'Falha ao registrar auditoria da identidade visual.' }, 500)
    }

    if (siteUrl || instagramHandle) {
      try {
        await triggerEnrichmentPipeline(compraId)
      } catch (triggerError) {
        console.error('[save-onboarding-identity] enrichment trigger error:', triggerError)
      }
    }

    return json({
      success: true,
      data: {
        identity_id: data.id,
        submission_id: submission.id,
        logo_history_id: logoHistoryId,
        logo_path: logoPath,
        campaign_images_count: imagesPaths.length,
      },
    })
  } catch (error) {
    console.error('[save-onboarding-identity] unexpected error:', error)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
})
