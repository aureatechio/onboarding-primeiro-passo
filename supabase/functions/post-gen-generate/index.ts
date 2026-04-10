import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import {
  validateImageFile,
  validatePrompt,
  validateFormat,
  nonEmptyString,
  errorJson,
  successJson,
  BUCKET_NAME,
} from '../_shared/garden/validate.ts'
import { generateImage } from '../_shared/ai-campaign/image-generator.ts'
import {
  type NanoBananaDbConfig,
  loadNanoBananaConfig,
  buildImageOverrides,
} from '../_shared/nanobanana/config.ts'

const URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60

function mimeToExt(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  return 'png'
}

function buildPostGenPrompt(
  fields: Record<string, string>,
  palette: string[],
  config: NanoBananaDbConfig | null,
): string {
  const sections: string[] = []

  // Briefing do negocio
  sections.push(
    `CREATIVE BRIEF:\n` +
    `- Celebrity: ${fields.celebrity_name}\n` +
    `- Business: ${fields.business}\n` +
    `- Segment: ${fields.segment} / ${fields.subsegment}\n` +
    `- Style: ${fields.style}\n` +
    (fields.city ? `- Location: ${fields.city}${fields.state ? `, ${fields.state}` : ''}\n` : '') +
    (fields.briefing ? `- Additional context: ${fields.briefing}\n` : ''),
  )

  // Paleta
  if (palette.length > 0) {
    sections.push(`BRAND PALETTE: ${palette.join(', ')}`)
  }

  // Direction (usar moderna como default para Post Gen)
  if (config?.direction_moderna) {
    sections.push(`CREATIVE DIRECTION:\n${config.direction_moderna}`)
  }

  // Format instructions
  const formatKey = `format_${fields.format.replace(':', '_')}` as keyof NanoBananaDbConfig
  const formatInstruction = config ? (config[formatKey] as string) : null
  if (formatInstruction) {
    sections.push(`FORMAT (${fields.format}):\n${formatInstruction}`)
  } else {
    sections.push(`FORMAT: ${fields.format}`)
  }

  // User prompt
  sections.push(`USER PROMPT:\n${fields.prompt}`)

  // Final instruction
  sections.push(
    'MANDATORY: Generate a professional advertising creative following ALL instructions above. ' +
    'Text must be in Brazilian Portuguese. Output a single image.',
  )

  return sections.join('\n\n---\n\n')
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const startMs = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const contentType = req.headers.get('content-type') || ''
    let fields: Record<string, string> = {}
    let logoFile: File | null = null
    let palette: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      logoFile = formData.get('logo') as File | null
      const paletteRaw = formData.get('palette') as string | null
      if (paletteRaw) {
        try { palette = JSON.parse(paletteRaw) } catch { /* ignore */ }
      }
      for (const key of ['celebrity_name', 'format', 'segment', 'subsegment', 'business', 'style', 'prompt', 'city', 'state', 'briefing']) {
        const val = formData.get(key) as string | null
        if (val) fields[key] = val
      }
    } else {
      const body = await req.json()
      fields = body
      palette = body.palette ?? []
    }

    // Validacoes
    const errors: string[] = []
    const requiredFields = ['celebrity_name', 'format', 'segment', 'subsegment', 'business', 'style', 'prompt']
    for (const f of requiredFields) {
      const err = f === 'prompt' ? validatePrompt(fields[f]) :
        f === 'format' ? validateFormat(fields[f]) :
          nonEmptyString(fields[f], f)
      if (err) errors.push(err)
    }
    const logoErr = validateImageFile(logoFile, 'logo', false)
    if (logoErr) errors.push(logoErr)

    if (errors.length > 0) {
      return errorJson('INVALID_INPUT', errors.join(' '), 400, corsHeaders)
    }

    console.log('[post-gen.request]', {
      request_id: requestId,
      format: fields.format,
      celebrity: fields.celebrity_name,
      segment: fields.segment,
      has_logo: !!logoFile,
      palette_count: palette.length,
      prompt_length: fields.prompt?.length,
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const jobId = crypto.randomUUID()
    let logoPath: string | null = null

    // Upload logo se presente
    if (logoFile) {
      const ext = mimeToExt(logoFile.type)
      logoPath = `gen/${jobId}/logo.${ext}`
      const { error: logoUploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(logoPath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        })
      if (logoUploadError) {
        console.error('[post-gen.logo-upload-error]', { request_id: requestId, error: logoUploadError.message })
        return errorJson('UPLOAD_ERROR', 'Falha ao fazer upload do logo.', 500, corsHeaders)
      }
    }

    // Criar job como processing
    const { error: insertError } = await supabase
      .from('garden_jobs')
      .insert({
        id: jobId,
        tool: 'post-gen',
        status: 'processing',
        input_prompt: fields.prompt,
        input_format: fields.format,
        input_model: 'nanobanana',
        input_metadata: {
          celebrity_name: fields.celebrity_name,
          segment: fields.segment,
          subsegment: fields.subsegment,
          business: fields.business,
          style: fields.style,
          city: fields.city || null,
          state: fields.state || null,
          briefing: fields.briefing || null,
          palette,
        },
        source_image_path: logoPath,
        request_id: requestId,
      })

    if (insertError) {
      console.error('[post-gen.insert-error]', { request_id: requestId, error: insertError.message })
      return errorJson('INTERNAL_ERROR', 'Falha ao criar job.', 500, corsHeaders)
    }

    // Background: gerar imagem
    const bgPromise = (async () => {
      try {
        const config = await loadNanoBananaConfig(supabase)

        // Se tem logo, obter signed URL
        let logoSignedUrl: string | undefined
        if (logoPath) {
          const { data: signedLogo } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(logoPath, 600)
          logoSignedUrl = signedLogo?.signedUrl
        }

        const fullPrompt = buildPostGenPrompt(fields, palette, config)

        // Para Post Gen sem imagem de referencia, usamos o logo como unica imagem (se disponivel)
        // generateImage espera (prompt, celebrity, logo, campaign?, reference?)
        // Aqui: celebrity = placeholder vazio, logo = logo do cliente
        const placeholderUrl = logoSignedUrl || ''
        const overrides = buildImageOverrides(config)
        const result = await generateImage(
          fullPrompt,
          placeholderUrl || 'https://placehold.co/1x1.png', // placeholder minimo se nao tiver logo
          logoSignedUrl || 'https://placehold.co/1x1.png',
          undefined,
          undefined,
          overrides,
        )

        const durationMs = Date.now() - startMs

        if (!result.success || !result.imageData) {
          await supabase
            .from('garden_jobs')
            .update({
              status: 'failed',
              error_code: 'PROVIDER_ERROR',
              error_message: result.error || 'Geracao falhou sem detalhe.',
              duration_ms: durationMs,
            })
            .eq('id', jobId)
          console.error('[post-gen.generation-failed]', { request_id: requestId, error: result.error, duration_ms: durationMs })
          return
        }

        // Upload resultado
        const outputPath = `gen/${jobId}/output.png`
        const { error: outputUploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(outputPath, result.imageData, {
            contentType: result.mimeType || 'image/png',
            upsert: false,
          })

        if (outputUploadError) {
          await supabase
            .from('garden_jobs')
            .update({
              status: 'failed',
              error_code: 'UPLOAD_ERROR',
              error_message: 'Falha ao salvar imagem gerada.',
              duration_ms: durationMs,
            })
            .eq('id', jobId)
          console.error('[post-gen.output-upload-error]', { request_id: requestId, error: outputUploadError.message })
          return
        }

        const { data: signedOutput } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(outputPath, URL_EXPIRY_SECONDS)

        await supabase
          .from('garden_jobs')
          .update({
            status: 'completed',
            output_image_path: outputPath,
            output_image_url: signedOutput?.signedUrl ?? null,
            duration_ms: durationMs,
          })
          .eq('id', jobId)

        console.log('[post-gen.complete]', { request_id: requestId, job_id: jobId, duration_ms: durationMs })
      } catch (err) {
        const durationMs = Date.now() - startMs
        const errMsg = err instanceof Error ? err.message : String(err)
        await supabase
          .from('garden_jobs')
          .update({
            status: 'failed',
            error_code: 'INTERNAL_ERROR',
            error_message: errMsg.substring(0, 500),
            duration_ms: durationMs,
          })
          .eq('id', jobId)
        console.error('[post-gen.error]', { request_id: requestId, error: errMsg, duration_ms: durationMs })
      }
    })()

    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      EdgeRuntime.waitUntil(bgPromise)
    }

    return successJson({
      job_id: jobId,
      status: 'processing',
      request_id: requestId,
    }, corsHeaders, 202)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[post-gen.error]', { request_id: requestId, error: errMsg })
    return errorJson('INTERNAL_ERROR', 'Erro interno.', 500, corsHeaders)
  }
})
