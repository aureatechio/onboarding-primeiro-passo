import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import {
  validateImageFile,
  validateFormat,
  errorJson,
  successJson,
  BUCKET_NAME,
} from '../_shared/garden/validate.ts'
import { generateImage } from '../_shared/ai-campaign/image-generator.ts'

const URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60
const VALID_DIRECTIONS = ['moderna', 'clean', 'retail'] as const

interface NanoBananaDbConfig {
  gemini_model_name: string
  gemini_api_base_url: string
  max_retries: number
  max_image_download_bytes: number
  direction_moderna: string
  direction_clean: string
  direction_retail: string
  format_1_1: string
  format_4_5: string
  format_16_9: string
  format_9_16: string
}

async function loadNanoBananaConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<NanoBananaDbConfig | null> {
  try {
    const { data, error } = await supabase
      .from('nanobanana_config')
      .select('*')
      .limit(1)
      .single()
    if (error || !data) return null
    return data as NanoBananaDbConfig
  } catch {
    return null
  }
}

function mimeToExt(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  return 'png'
}

function buildPostTurboPrompt(
  direction: string,
  directionText: string,
  format: string,
  userPrompt: string | null,
  palette: string[],
  celebrityName: string | null,
  config: NanoBananaDbConfig | null,
): string {
  const sections: string[] = []

  // Creative direction
  sections.push(`CREATIVE DIRECTION (${direction}):\n${directionText}`)

  // Palette
  if (palette.length > 0) {
    sections.push(`BRAND PALETTE: ${palette.join(', ')}`)
  }

  // Celebrity
  if (celebrityName) {
    sections.push(`CELEBRITY: ${celebrityName}`)
  }

  // Format instructions
  const formatKey = `format_${format.replace(':', '_')}` as keyof NanoBananaDbConfig
  const formatInstruction = config ? (config[formatKey] as string) : null
  if (formatInstruction) {
    sections.push(`FORMAT (${format}):\n${formatInstruction}`)
  } else {
    sections.push(`FORMAT: ${format}`)
  }

  // User prompt
  if (userPrompt?.trim()) {
    sections.push(`USER INSTRUCTIONS:\n${userPrompt}`)
  }

  // Final instruction
  sections.push(
    'MANDATORY: Enhance and improve this base image into a professional advertising creative ' +
    'following ALL directions above. Use the brand logo and palette if provided. ' +
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
    if (!contentType.includes('multipart/form-data')) {
      return errorJson('INVALID_INPUT', 'Content-Type deve ser multipart/form-data.', 400, corsHeaders)
    }

    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null
    const directionParam = (formData.get('direction') as string) ?? ''
    const format = (formData.get('format') as string) ?? ''
    const prompt = (formData.get('prompt') as string) ?? ''
    const celebrityName = (formData.get('celebrity_name') as string) ?? ''
    const logoFile = formData.get('logo') as File | null
    const productFile = formData.get('product_image') as File | null
    const paletteRaw = formData.get('palette') as string | null
    let palette: string[] = []
    if (paletteRaw) {
      try { palette = JSON.parse(paletteRaw) } catch { /* ignore */ }
    }

    // Validations
    const errors: string[] = []
    const imgErr = validateImageFile(imageFile, 'image', true)
    if (imgErr) errors.push(imgErr)
    const formatErr = validateFormat(format)
    if (formatErr) errors.push(formatErr)
    if (!VALID_DIRECTIONS.includes(directionParam as typeof VALID_DIRECTIONS[number])) {
      errors.push(`direction invalido. Valores aceitos: ${VALID_DIRECTIONS.join(', ')}`)
    }
    const logoErr = validateImageFile(logoFile, 'logo', false)
    if (logoErr) errors.push(logoErr)
    const productErr = validateImageFile(productFile, 'product_image', false)
    if (productErr) errors.push(productErr)

    if (errors.length > 0) {
      return errorJson('INVALID_INPUT', errors.join(' '), 400, corsHeaders)
    }

    console.log('[post-turbo.request]', {
      request_id: requestId,
      format,
      direction: directionParam,
      has_celebrity: !!celebrityName,
      has_logo: !!logoFile,
      has_product: !!productFile,
      palette_count: palette.length,
      prompt_length: prompt.length,
      image_size: imageFile!.size,
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const jobId = crypto.randomUUID()
    const ext = mimeToExt(imageFile!.type)
    const sourcePath = `turbo/${jobId}/source.${ext}`

    // Upload source image
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(sourcePath, imageFile!, {
        contentType: imageFile!.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[post-turbo.upload-error]', { request_id: requestId, error: uploadError.message })
      return errorJson('UPLOAD_ERROR', 'Falha ao fazer upload da imagem.', 500, corsHeaders)
    }

    // Upload logo if present
    let logoPath: string | null = null
    if (logoFile) {
      const logoExt = mimeToExt(logoFile.type)
      logoPath = `turbo/${jobId}/logo.${logoExt}`
      const { error: logoUploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(logoPath, logoFile, { contentType: logoFile.type, upsert: false })
      if (logoUploadError) {
        console.error('[post-turbo.logo-upload-error]', { request_id: requestId, error: logoUploadError.message })
        return errorJson('UPLOAD_ERROR', 'Falha ao fazer upload do logo.', 500, corsHeaders)
      }
    }

    // Upload product image if present
    let productPath: string | null = null
    if (productFile) {
      const prodExt = mimeToExt(productFile.type)
      productPath = `turbo/${jobId}/product.${prodExt}`
      const { error: prodUploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(productPath, productFile, { contentType: productFile.type, upsert: false })
      if (prodUploadError) {
        console.error('[post-turbo.product-upload-error]', { request_id: requestId, error: prodUploadError.message })
        return errorJson('UPLOAD_ERROR', 'Falha ao fazer upload da imagem de produto.', 500, corsHeaders)
      }
    }

    // Create job
    const { error: insertError } = await supabase
      .from('garden_jobs')
      .insert({
        id: jobId,
        tool: 'post-turbo',
        status: 'processing',
        input_prompt: prompt || directionParam,
        input_format: format,
        input_model: 'nanobanana',
        input_metadata: {
          direction: directionParam,
          celebrity_name: celebrityName || null,
          has_logo: !!logoFile,
          has_product_image: !!productFile,
          palette,
        },
        source_image_path: sourcePath,
        request_id: requestId,
      })

    if (insertError) {
      console.error('[post-turbo.insert-error]', { request_id: requestId, error: insertError.message })
      return errorJson('INTERNAL_ERROR', 'Falha ao criar job.', 500, corsHeaders)
    }

    // Background: generate image
    const bgPromise = (async () => {
      try {
        const config = await loadNanoBananaConfig(supabase)

        // Get direction text from config
        const dirKey = `direction_${directionParam}` as keyof NanoBananaDbConfig
        const directionText = config ? (config[dirKey] as string) || '' : ''

        // Build enriched prompt
        const fullPrompt = buildPostTurboPrompt(
          directionParam,
          directionText,
          format,
          prompt || null,
          palette,
          celebrityName || null,
          config,
        )

        // Resolve celebrity image URL from database
        let celebrityImageUrl = ''
        if (celebrityName) {
          const { data: celeb } = await supabase
            .from('celebridades')
            .select('nome, fotoPrincipal')
            .eq('nome', celebrityName)
            .eq('ativo', true)
            .limit(1)
            .single()
          if (celeb?.fotoPrincipal) {
            celebrityImageUrl = celeb.fotoPrincipal
          }
        }

        // Generate signed URLs for uploaded assets
        const { data: signedSource } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(sourcePath, 600)
        if (!signedSource?.signedUrl) {
          throw new Error('Falha ao gerar signed URL da imagem source.')
        }

        let logoSignedUrl: string | undefined
        if (logoPath) {
          const { data: signedLogo } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(logoPath, 600)
          logoSignedUrl = signedLogo?.signedUrl
        }

        let productSignedUrl: string | undefined
        if (productPath) {
          const { data: signedProduct } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(productPath, 600)
          productSignedUrl = signedProduct?.signedUrl
        }

        // Map to generateImage slots:
        // (prompt, celebrityPngUrl, clientLogoUrl, campaignImageUrl?, categoryReferenceImageUrl?)
        //
        // Celebrity slot: celebrity image if selected, otherwise base image
        // Logo slot: logo if uploaded, otherwise base image
        // Campaign slot: product image if uploaded
        const celebritySlot = celebrityImageUrl || signedSource.signedUrl
        const logoSlot = logoSignedUrl || signedSource.signedUrl
        const campaignSlot = productSignedUrl

        const result = await generateImage(
          fullPrompt,
          celebritySlot,
          logoSlot,
          campaignSlot,
          signedSource.signedUrl, // base image always as reference
          {
            modelName: config?.gemini_model_name,
            baseUrl: config?.gemini_api_base_url,
            maxRetries: config?.max_retries ?? 2,
            maxImageDownloadBytes: config?.max_image_download_bytes,
          },
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
          console.error('[post-turbo.generation-failed]', { request_id: requestId, error: result.error, duration_ms: durationMs })
          return
        }

        // Upload output
        const outputPath = `turbo/${jobId}/output.png`
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
          console.error('[post-turbo.output-upload-error]', { request_id: requestId, error: outputUploadError.message })
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

        console.log('[post-turbo.complete]', { request_id: requestId, job_id: jobId, duration_ms: durationMs })
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
        console.error('[post-turbo.error]', { request_id: requestId, error: errMsg, duration_ms: durationMs })
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
    console.error('[post-turbo.error]', { request_id: requestId, error: errMsg })
    return errorJson('INTERNAL_ERROR', 'Erro interno.', 500, corsHeaders)
  }
})
