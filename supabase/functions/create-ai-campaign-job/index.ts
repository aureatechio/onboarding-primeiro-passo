import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireServiceRole } from '../_shared/service-role-auth.ts'
import { checkAiCampaignEligibility } from '../_shared/ai-campaign/eligibility.ts'
import {
  buildPrompt,
  computeInputHashAsync,
  GROUPS,
  FORMATS,
  type PromptInput,
  type GroupName,
  type FormatName,
  type BriefingContext,
  type InsightPeca,
} from '../_shared/ai-campaign/prompt-builder.ts'
import { log } from '../_shared/ai-campaign/logger.ts'
import {
  type NanoBananaDbConfig,
  type DirectionMode,
  loadNanoBananaConfig,
  resolveSafetyPreset,
  REFERENCE_BUCKET,
} from '../_shared/nanobanana/config.ts'

const URL_EXPIRY_SECONDS = parseInt(Deno.env.get('AI_CAMPAIGN_URL_EXPIRY_SECONDS') ?? '604800', 10)

const FORMAT_TO_ASPECT_RATIO: Record<string, string> = {
  '1:1': '1:1',
  '4:5': '4:5',
  '16:9': '16:9',
  '9:16': '9:16',
}

interface ResolvedGroupDirection {
  text: string
  referenceImageUrl: string | undefined
}

async function readDirectionTextFromImage(
  imagePath: string,
  group: GroupName,
  supabase: ReturnType<typeof createClient>,
  urlExpirySec: number,
  nbConfig: NanoBananaDbConfig,
): Promise<string | null> {
  const { data: signedData } = await supabase.storage
    .from(REFERENCE_BUCKET)
    .createSignedUrl(imagePath, urlExpirySec)

  const imageUrl = signedData?.signedUrl
  if (!imageUrl) return null

  try {
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) return null
    const contentType = imageRes.headers.get('content-type') || 'image/png'
    const buffer = await imageRes.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)

    const titleByGroup: Record<GroupName, string> = {
      moderna: 'CREATIVE DIRECTION — MODERNA (Dark & Bold)',
      clean: 'CREATIVE DIRECTION — CLEAN (Light & Editorial)',
      retail: 'CREATIVE DIRECTION — RETAIL (Hard Sell & Impact)',
    }
    const readPrompt = [
      'Você é Diretor de Arte Sênior.',
      `Analise a imagem enviada e responda SOMENTE neste formato para a categoria ${group.toUpperCase()}:`,
      '',
      titleByGroup[group],
      '- Background: ...',
      '- Celebrity: ...',
      '- Layout: ...',
      '- Typography: ...',
      '- Reference mood: ...',
      '',
      'Regras obrigatórias:',
      '- Responda em inglês.',
      '- Texto objetivo e acionável para geração de criativo.',
      '- Não inclua texto fora desse bloco.',
    ].join('\n')

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return null

    const modelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-1.5-flash'
    const baseUrl = Deno.env.get('GEMINI_API_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta'
    const endpoint = `${baseUrl}/models/${modelName}:generateContent`

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: contentType.split(';')[0].trim(), data: base64 } },
            { text: readPrompt },
          ],
        }],
      }),
    })

    if (!geminiRes.ok) return null

    const geminiResult = await geminiRes.json()
    const parts = geminiResult?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts)) return null
    const text = parts.map((p: Record<string, unknown>) => (typeof p?.text === 'string' ? p.text : '')).join('\n').trim()
    return text || null
  } catch {
    return null
  }
}

async function resolveGroupDirections(
  supabase: ReturnType<typeof createClient>,
  nbConfig: NanoBananaDbConfig,
  urlExpirySec: number,
): Promise<Record<GroupName, ResolvedGroupDirection>> {
  const result: Record<GroupName, ResolvedGroupDirection> = {
    moderna: { text: resolveDirectionPromptText('moderna', nbConfig), referenceImageUrl: undefined },
    clean: { text: resolveDirectionPromptText('clean', nbConfig), referenceImageUrl: undefined },
    retail: { text: resolveDirectionPromptText('retail', nbConfig), referenceImageUrl: undefined },
  }

  const groupsToProcess: GroupName[] = ['moderna', 'clean', 'retail']

  await Promise.all(groupsToProcess.map(async (group) => {
    const mode: DirectionMode = (nbConfig[`direction_${group}_mode` as keyof NanoBananaDbConfig] as DirectionMode) || 'text'
    const imagePath = nbConfig[`direction_${group}_image_path` as keyof NanoBananaDbConfig] as string | null

    if (mode === 'text' || !imagePath) return

    const { data: signedData } = await supabase.storage
      .from(REFERENCE_BUCKET)
      .createSignedUrl(imagePath, urlExpirySec)

    const imageUrl = signedData?.signedUrl || undefined

    if (mode === 'both') {
      result[group].referenceImageUrl = imageUrl
      return
    }

    // mode === 'image': re-read the reference image via Gemini to get fresh direction text
    if (imageUrl) {
      const freshText = await readDirectionTextFromImage(imagePath, group, supabase, urlExpirySec, nbConfig)
      if (freshText) result[group].text = freshText
      result[group].referenceImageUrl = imageUrl
    }
  }))

  return result
}

function buildReferenceSignature(config?: NanoBananaDbConfig | null): string {
  if (!config) return ''
  const payload = {
    moderna: {
      text: config.direction_moderna ?? '',
    },
    clean: {
      text: config.direction_clean ?? '',
    },
    retail: {
      text: config.direction_retail ?? '',
    },
  }
  return JSON.stringify(payload)
}

function resolveDirectionPromptText(group: GroupName, config: NanoBananaDbConfig): string {
  const raw = group === 'moderna'
    ? config.direction_moderna
    : group === 'clean'
      ? config.direction_clean
      : config.direction_retail
  return (raw ?? '').trim()
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface CreateJobBody {
  compra_id: string
  job_id?: string
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = requireServiceRole(req)
  if (!authResult.authorized) return authResult.response

  let body: CreateJobBody
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_BODY', message: 'Body JSON invalido.' }, 400)
  }

  const { compra_id, job_id: forceJobId } = body

  if (!compra_id) {
    return json({ success: false, code: 'MISSING_REQUIRED_FIELDS', message: 'Campo obrigatorio: compra_id.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // --- 1. Check eligibility ---
  const eligibility = await checkAiCampaignEligibility(supabase, compra_id)
  if (!eligibility.eligible) {
    return json({
      success: false,
      code: 'NOT_ELIGIBLE',
      reason: eligibility.reason,
      message: eligibility.reason === 'compra_not_found'
        ? 'Compra nao encontrada.'
        : eligibility.reason === 'compra_nao_paga'
          ? 'Compra ainda nao paga.'
          : 'Contrato ainda nao assinado.',
    }, 409)
  }

  // --- 2. Load identity from onboarding_identity ---
  const { data: identity, error: identityError } = await supabase
    .from('onboarding_identity')
    .select('logo_path, brand_palette, font_choice, campaign_notes, campaign_images_paths')
    .eq('compra_id', compra_id)
    .maybeSingle()

  if (identityError) {
    log.error({ compraId: compra_id, stage: 'ingestion' }, 'Error loading identity', { error: identityError.message })
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar identidade visual.' }, 500)
  }

  if (!identity || !identity.brand_palette?.length || !identity.font_choice) {
    return json({
      success: false,
      code: 'IDENTITY_NOT_FOUND',
      message: 'Identidade visual incompleta. Preencha cores e fonte na Etapa 6.2 do onboarding.',
    }, 422)
  }

  // --- 3. Generate signed URL for logo (optional — enrichment may run without logo) ---
  let clientLogoUrl = ''
  if (identity.logo_path) {
    const { data: logoSignedData } = await supabase.storage
      .from('onboarding-identity')
      .createSignedUrl(identity.logo_path, URL_EXPIRY_SECONDS)
    clientLogoUrl = logoSignedData?.signedUrl || ''
  }

  // --- 4. Generate signed URLs for campaign images ---
  let campaignImageUrl: string | undefined
  if (identity.campaign_images_paths?.length > 0) {
    const { data: imgSignedData } = await supabase.storage
      .from('onboarding-identity')
      .createSignedUrl(identity.campaign_images_paths[0], URL_EXPIRY_SECONDS)
    campaignImageUrl = imgSignedData?.signedUrl || undefined
  }

  // --- 5. Load celebrity data ---
  const celebridadeId = eligibility.compra!.celebridade
  let celebrityPngUrl = ''
  let clientName = ''
  let celebName = ''

  if (celebridadeId) {
    const { data: celeb } = await supabase
      .from('celebridadesReferencia')
      .select('nome, fotoPrincipal')
      .eq('id', celebridadeId)
      .maybeSingle()
    if (celeb) {
      celebName = celeb.nome || 'Celebridade'
      celebrityPngUrl = celeb.fotoPrincipal || ''
    }
  }

  if (eligibility.compra!.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, nome_fantasia')
      .eq('id', eligibility.compra!.cliente_id)
      .maybeSingle()
    if (cliente) {
      clientName = cliente.nome || cliente.nome_fantasia || 'Cliente'
    }
  }

  if (!celebrityPngUrl) {
    return json({
      success: false,
      code: 'MISSING_CELEBRITY_IMAGE',
      message: 'Imagem da celebridade nao encontrada.',
    }, 422)
  }

  // --- 5b. Load briefing from onboarding_briefings (enrichment pipeline) ---
  let briefingContext: BriefingContext | undefined
  let insightsPecas: InsightPeca[] | undefined
  {
    const { data: briefingRow } = await supabase
      .from('onboarding_briefings')
      .select('briefing_json, status')
      .eq('compra_id', compra_id)
      .eq('status', 'done')
      .maybeSingle()

    if (briefingRow?.briefing_json) {
      const b = briefingRow.briefing_json as Record<string, unknown>
      briefingContext = {
        objetivo_campanha: typeof b.objetivo_campanha === 'string' ? b.objetivo_campanha : undefined,
        publico_alvo: typeof b.publico_alvo === 'string' ? b.publico_alvo : undefined,
        tom_voz: typeof b.tom_voz === 'string' ? b.tom_voz : undefined,
        mensagem_central: typeof b.mensagem_central === 'string' ? b.mensagem_central : undefined,
        cta_principal: typeof b.cta_principal === 'string' ? b.cta_principal : undefined,
      }
      const hasAnyField = Object.values(briefingContext).some(Boolean)
      if (!hasAnyField) briefingContext = undefined

      if (Array.isArray(b.insights_pecas)) {
        insightsPecas = (b.insights_pecas as Record<string, unknown>[]).map((p) => ({
          variacao: typeof p.variacao === 'number' ? p.variacao : 0,
          diferencial: typeof p.diferencial === 'string' ? p.diferencial : undefined,
          formato: typeof p.formato === 'string' ? p.formato : undefined,
          plataforma: typeof p.plataforma === 'string' ? p.plataforma : undefined,
          gancho: typeof p.gancho === 'string' ? p.gancho : undefined,
          chamada_principal: typeof p.chamada_principal === 'string' ? p.chamada_principal : undefined,
          texto_apoio: typeof p.texto_apoio === 'string' ? p.texto_apoio : undefined,
          cta: typeof p.cta === 'string' ? p.cta : undefined,
          direcao_criativa: typeof p.direcao_criativa === 'string' ? p.direcao_criativa : undefined,
        }))
        if (insightsPecas.length === 0) insightsPecas = undefined
      }
    }
  }

  // --- 5c. Load NanoBanana config from DB (single source of truth, no fallback) ---
  const nbConfig = await loadNanoBananaConfig(supabase)
  if (!nbConfig) {
    log.error({ compraId: compra_id, stage: 'ingestion' }, 'NanoBanana config not found in DB')
    return json({
      success: false,
      code: 'NANOBANANA_CONFIG_MISSING',
      message: 'Configuração NanoBanana não encontrada. Popule a tabela nanobanana_config.',
    }, 500)
  }

  const requiredStringFields: Array<keyof NanoBananaDbConfig> = [
    'global_rules',
    'global_rules_version',
    'prompt_version',
    'direction_moderna',
    'direction_clean',
    'direction_retail',
    'format_1_1',
    'format_4_5',
    'format_16_9',
    'format_9_16',
  ]
  const missingFields = requiredStringFields.filter((k) => {
    const v = nbConfig[k]
    return typeof v !== 'string' || v.trim().length === 0
  })
  if (missingFields.length > 0) {
    log.error({ compraId: compra_id, stage: 'ingestion' }, 'NanoBanana config incomplete', { missing: missingFields })
    return json({
      success: false,
      code: 'NANOBANANA_CONFIG_INCOMPLETE',
      message: `Campos obrigatórios vazios em nanobanana_config: ${missingFields.join(', ')}`,
    }, 500)
  }

  const effectiveGlobalRules = nbConfig.global_rules
  const effectivePromptVersion = nbConfig.prompt_version
  const effectiveGlobalRulesVersion = nbConfig.global_rules_version

  // --- 6. Pre-resolve per-group direction text and reference image URLs ---
  const resolvedDirections = await resolveGroupDirections(supabase, nbConfig, URL_EXPIRY_SECONDS)

  const groupDirections: Record<GroupName, string> = {
    moderna: resolvedDirections.moderna.text,
    clean: resolvedDirections.clean.text,
    retail: resolvedDirections.retail.text,
  }
  const formatInstructions: Record<FormatName, string> = {
    '1:1': nbConfig.format_1_1,
    '4:5': nbConfig.format_4_5,
    '16:9': nbConfig.format_16_9,
    '9:16': nbConfig.format_9_16,
  }

  // --- 7. Build prompt input and compute hash ---
  const promptInput: PromptInput = {
    globalRules: nbConfig.use_system_instruction ? '' : effectiveGlobalRules,
    clientName,
    celebName,
    brandPalette: identity.brand_palette,
    fontChoice: identity.font_choice,
    campaignNotes: identity.campaign_notes || '',
    briefing: briefingContext,
    insightsPecas,
    groupDirections,
    formatInstructions,
  }

  const inputHash = await computeInputHashAsync(promptInput, {
    campaignImageUrl,
    referenceSignature: buildReferenceSignature(nbConfig),
    promptVersion: effectivePromptVersion,
    globalRulesVersion: effectiveGlobalRulesVersion,
  })

  // --- 7. Idempotency check ---
  // When forceJobId is provided (from retry flow), look up by ID directly to avoid
  // hash mismatch when NanoBanana config changed between original creation and retry.
  const existingJobQuery = forceJobId
    ? supabase
        .from('ai_campaign_jobs')
        .select('id, status, total_generated')
        .eq('id', forceJobId)
        .eq('compra_id', compra_id)
        .maybeSingle()
    : supabase
        .from('ai_campaign_jobs')
        .select('id, status, total_generated')
        .eq('compra_id', compra_id)
        .eq('input_hash', inputHash)
        .maybeSingle()

  const { data: existingJob } = await existingJobQuery

  if (existingJob) {
    if (existingJob.status === 'completed') {
      return json({
        success: true,
        job_id: existingJob.id,
        status: existingJob.status,
        total_generated: existingJob.total_generated,
        message: 'Job ja concluido.',
      })
    }
    if (existingJob.status === 'processing' || existingJob.status === 'partial' || existingJob.status === 'failed') {
      const { data: pendingAssets } = await supabase
        .from('ai_campaign_assets')
        .select('id, group_name, format')
        .eq('job_id', existingJob.id)
        .in('status', ['pending', 'processing'])

      if (pendingAssets && pendingAssets.length > 0) {
        log.info(
          { compraId: compra_id, stage: 'ingestion' },
          `Resuming job ${existingJob.id}: ${pendingAssets.length} assets remaining`,
        )

        await supabase.from('ai_campaign_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', existingJob.id)

        const backgroundWork = dispatchWorkers(
          supabaseUrl, serviceRoleKey, supabase,
          existingJob.id, compra_id, promptInput, pendingAssets,
          celebrityPngUrl, clientLogoUrl, campaignImageUrl, nbConfig, resolvedDirections,
          effectivePromptVersion,
        )

        // @ts-ignore — EdgeRuntime.waitUntil
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(backgroundWork)
        } else {
          backgroundWork.catch((e) =>
            log.error({ jobId: existingJob.id, compraId: compra_id, stage: 'generation' }, 'Background resume error', { error: String(e) })
          )
        }

        return json({
          success: true,
          job_id: existingJob.id,
          status: 'processing',
          total_generated: existingJob.total_generated,
          remaining: pendingAssets.length,
          message: `Retomando job. ${pendingAssets.length} assets restantes.`,
        })
      }

      const reconciled = await reconcileJobStatusFromAssets(supabase, existingJob.id)
      return json({
        success: true,
        job_id: existingJob.id,
        status: reconciled.status,
        total_generated: reconciled.total_generated,
        message: `Job ${reconciled.status}. Sem assets pendentes.`,
      })
    }
  }

  // --- 8. Create job ---
  const totalExpected = GROUPS.length * FORMATS.length
  const { data: newJob, error: insertError } = await supabase
    .from('ai_campaign_jobs')
    .insert({
      compra_id,
      status: 'processing',
      input_hash: inputHash,
      prompt_version: effectivePromptVersion,
      total_expected: totalExpected,
      total_generated: 0,
    })
    .select('id')
    .single()

  if (insertError || !newJob) {
    if (insertError?.code === '23505') {
      return json({ success: true, message: 'Job ja existe para estes inputs.', code: 'DUPLICATE' })
    }
    log.error({ compraId: compra_id, stage: 'persistence' }, 'Job insert error', { error: insertError?.message })
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao criar job.' }, 500)
  }

  const jobId = newJob.id

  // --- 9. Pre-create 12 asset rows with status=pending ---
  const assetRows: { job_id: string; group_name: string; format: string; image_url: string; prompt_version: string; status: string }[] = []
  for (const group of GROUPS) {
    for (const format of FORMATS) {
      assetRows.push({
        job_id: jobId,
        group_name: group,
        format,
        image_url: '',
        prompt_version: effectivePromptVersion,
        status: 'pending',
      })
    }
  }

  const { data: insertedAssets, error: assetsError } = await supabase
    .from('ai_campaign_assets')
    .insert(assetRows)
    .select('id, group_name, format')

  if (assetsError || !insertedAssets) {
    log.error({ jobId, compraId: compra_id, stage: 'persistence' }, 'Asset rows insert error', { error: assetsError?.message })
    await supabase.from('ai_campaign_jobs').delete().eq('id', jobId)
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao criar assets.' }, 500)
  }

  log.info({ jobId, compraId: compra_id, stage: 'ingestion' }, 'Job created, dispatching workers', {
    promptVersion: effectivePromptVersion,
    globalRulesVersion: effectiveGlobalRulesVersion,
    totalAssets: insertedAssets.length,
  })

  // --- 10. Return immediately, dispatch workers in background ---
  const backgroundWork = dispatchWorkers(
    supabaseUrl, serviceRoleKey, supabase,
    jobId, compra_id, promptInput, insertedAssets,
    celebrityPngUrl, clientLogoUrl, campaignImageUrl, nbConfig, resolvedDirections,
    effectivePromptVersion,
  )

  // @ts-ignore — EdgeRuntime.waitUntil available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(backgroundWork)
  } else {
    backgroundWork.catch((e) =>
      log.error({ jobId, compraId: compra_id, stage: 'generation' }, 'Background dispatch error', { error: String(e) })
    )
  }

  return json({
    success: true,
    job_id: jobId,
    status: 'processing',
    total_expected: totalExpected,
    message: 'Job criado. Use get-ai-campaign-status para acompanhar.',
  })
})

async function dispatchWorkers(
  supabaseUrl: string,
  serviceRoleKey: string,
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  compraId: string,
  promptInput: PromptInput,
  assets: { id: string; group_name: string; format: string }[],
  celebrityPngUrl: string,
  clientLogoUrl: string,
  campaignImageUrl: string | undefined,
  nbConfig: NanoBananaDbConfig,
  resolvedDirections: Record<GroupName, ResolvedGroupDirection>,
  promptVersion: string,
): Promise<void> {
  const workerUrl = `${supabaseUrl}/functions/v1/generate-ai-campaign-image`
  const dbBatchSize = nbConfig.worker_batch_size
  const workerBatchSize = Number.parseInt(Deno.env.get('AI_CAMPAIGN_WORKER_BATCH_SIZE') ?? String(dbBatchSize ?? 4), 10)
  const batchSize = Number.isNaN(workerBatchSize) || workerBatchSize < 1 ? 4 : workerBatchSize

  let successCalls = 0
  let failedCalls = 0

  for (let index = 0; index < assets.length; index += batchSize) {
    const batch = assets.slice(index, index + batchSize)
    const settled = await Promise.allSettled(
      batch.map(async (asset, batchIdx) => {
        const variationIndex = index + batchIdx + 1
        const prompt = buildPrompt(
          promptInput,
          asset.group_name as GroupName,
          asset.format as FormatName,
          variationIndex,
        )

        try {
          const res = await fetch(workerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              job_id: jobId,
              asset_id: asset.id,
              compra_id: compraId,
              group_name: asset.group_name,
              format: asset.format,
              celebrity_png_url: celebrityPngUrl,
              client_logo_url: clientLogoUrl,
              campaign_image_url: campaignImageUrl,
              reference_image_url: resolvedDirections[asset.group_name as GroupName]?.referenceImageUrl,
              aspect_ratio: FORMAT_TO_ASPECT_RATIO[asset.format],
              prompt,
              prompt_version: promptVersion,
              gemini_model_name: nbConfig.gemini_model_name,
              gemini_api_base_url: nbConfig.gemini_api_base_url,
              max_retries: nbConfig.max_retries,
              max_image_download_bytes: nbConfig.max_image_download_bytes,
              temperature: nbConfig.temperature,
              top_p: nbConfig.top_p,
              top_k: nbConfig.top_k,
              safety_settings: resolveSafetyPreset(nbConfig.safety_preset),
              system_instruction_text: nbConfig.use_system_instruction
                ? nbConfig.global_rules
                : undefined,
            }),
          })

          if (!res.ok) {
            const bodyText = await res.text()
            const message = `Worker HTTP ${res.status}: ${bodyText.substring(0, 200)}`
            await markAssetFailedByOrchestrator(
              supabase,
              asset.id,
              jobId,
              asset.group_name,
              asset.format,
              'worker_http_error',
              message,
            )
            throw new Error(message)
          }

          let workerResult: { success?: boolean; error?: string } | null = null
          try {
            workerResult = await res.json() as { success?: boolean; error?: string }
          } catch {
            const message = 'Worker returned invalid JSON response'
            await markAssetFailedByOrchestrator(
              supabase,
              asset.id,
              jobId,
              asset.group_name,
              asset.format,
              'worker_response_invalid',
              message,
            )
            throw new Error(message)
          }

          if (!workerResult?.success) {
            const message = workerResult?.error || 'Worker returned success=false'
            await markAssetFailedByOrchestrator(
              supabase,
              asset.id,
              jobId,
              asset.group_name,
              asset.format,
              'worker_response_invalid',
              message,
            )
            throw new Error(message)
          }
        } catch (err) {
          // If we get here due to network/runtime exceptions before any non-200 response,
          // ensure asset is not left in pending/processing without diagnostic evidence.
          const message = err instanceof Error ? err.message : String(err)
          if (!message.startsWith('Worker HTTP') && !message.includes('success=false') && !message.includes('invalid JSON')) {
            await markAssetFailedByOrchestrator(
              supabase,
              asset.id,
              jobId,
              asset.group_name,
              asset.format,
              'worker_call_exception',
              message,
            )
          }
          throw err
        }
      }),
    )

    for (const item of settled) {
      if (item.status === 'fulfilled') successCalls++
      else {
        failedCalls++
        log.error(
          { jobId, compraId, stage: 'generation' },
          'Worker call failed',
          { error: item.reason instanceof Error ? item.reason.message : String(item.reason) },
        )
      }
    }

    const completedCount = await getCompletedCount(supabase, jobId)
    await updateJobProgress(supabase, jobId, completedCount)
  }

  // Reconcile any stale non-terminal assets to avoid silent "failed job + processing assets" mismatch.
  let finalSummary = await getAssetStatusSummary(supabase, jobId)
  if (failedCalls > 0 && (finalSummary.pending > 0 || finalSummary.processing > 0)) {
    const staleCount = await reconcileStaleAssets(supabase, jobId)
    if (staleCount > 0) {
      log.warn(
        { jobId, compraId, stage: 'persistence' },
        'Reconciled stale non-terminal assets after worker failures',
        { staleCount },
      )
      finalSummary = await getAssetStatusSummary(supabase, jobId)
    }
  }

  const completedCount = finalSummary.completed
  const finalStatus = computeTerminalJobStatus(finalSummary)

  await supabase
    .from('ai_campaign_jobs')
    .update({
      status: finalStatus,
      total_generated: completedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  log.info({ jobId, compraId, stage: 'delivery' }, `Job finished: ${finalStatus}`, {
    completed: completedCount,
    failed: finalSummary.failed,
    failedCalls,
    successCalls,
    total: finalSummary.total,
  })
}

async function markAssetFailedByOrchestrator(
  supabase: ReturnType<typeof createClient>,
  assetId: string,
  jobId: string,
  groupName: string,
  format: string,
  errorType: string,
  errorMessage: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('ai_campaign_assets')
    .update({ status: 'failed' })
    .eq('id', assetId)

  if (updateError) {
    log.error(
      { jobId, stage: 'persistence', group: groupName, format },
      'Failed to update asset status to failed',
      { error: updateError.message, assetId },
    )
  }

  const { error: insertError } = await supabase
    .from('ai_campaign_errors')
    .insert({
      job_id: jobId,
      group_name: groupName,
      format,
      error_type: errorType,
      error_message: errorMessage.substring(0, 1000),
      attempt: 1,
    })

  if (insertError) {
    log.error(
      { jobId, stage: 'persistence', group: groupName, format },
      'Failed to insert ai_campaign_errors row',
      { error: insertError.message, assetId, errorType },
    )
  }
}

async function reconcileStaleAssets(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
): Promise<number> {
  const { data: staleAssets } = await supabase
    .from('ai_campaign_assets')
    .select('id, group_name, format')
    .eq('job_id', jobId)
    .in('status', ['pending', 'processing'])

  if (!staleAssets || staleAssets.length === 0) return 0

  for (const asset of staleAssets) {
    await markAssetFailedByOrchestrator(
      supabase,
      asset.id,
      jobId,
      asset.group_name,
      asset.format,
      'stale_processing_timeout',
      'Asset reconciled to failed after worker failure without terminal status update',
    )
  }

  return staleAssets.length
}

async function getCompletedCount(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
): Promise<number> {
  const { data } = await supabase
    .from('ai_campaign_assets')
    .select('id')
    .eq('job_id', jobId)
    .eq('status', 'completed')

  return data?.length ?? 0
}

async function getAssetStatusSummary(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
): Promise<{ total: number; completed: number; failed: number; processing: number; pending: number }> {
  const { data } = await supabase
    .from('ai_campaign_assets')
    .select('status')
    .eq('job_id', jobId)

  const summary = { total: 0, completed: 0, failed: 0, processing: 0, pending: 0 }
  for (const row of data || []) {
    summary.total += 1
    if (row.status === 'completed') summary.completed += 1
    else if (row.status === 'failed') summary.failed += 1
    else if (row.status === 'processing') summary.processing += 1
    else if (row.status === 'pending') summary.pending += 1
  }

  return summary
}

function computeTerminalJobStatus(
  summary: { total: number; completed: number; failed: number; processing: number; pending: number }
): 'processing' | 'completed' | 'partial' | 'failed' {
  if (summary.pending > 0 || summary.processing > 0) return 'processing'
  if (summary.total > 0 && summary.completed === summary.total) return 'completed'
  if (summary.completed > 0) return 'partial'
  return 'failed'
}

async function updateJobProgress(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  completedCount: number,
): Promise<void> {
  await supabase
    .from('ai_campaign_jobs')
    .update({ total_generated: completedCount, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function reconcileJobStatusFromAssets(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
): Promise<{ status: 'processing' | 'completed' | 'partial' | 'failed'; total_generated: number }> {
  const { data: rows } = await supabase
    .from('ai_campaign_assets')
    .select('status')
    .eq('job_id', jobId)

  const total = rows?.length ?? 0
  const completedCount = rows?.filter((row) => row.status === 'completed').length ?? 0
  const processingOrPending = rows?.some(
    (row) => row.status === 'processing' || row.status === 'pending',
  ) ?? false

  const status: 'processing' | 'completed' | 'partial' | 'failed' = processingOrPending
    ? 'processing'
    : completedCount === total && total > 0
      ? 'completed'
      : completedCount > 0
        ? 'partial'
        : 'failed'

  await supabase
    .from('ai_campaign_jobs')
    .update({
      status,
      total_generated: completedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  return { status, total_generated: completedCount }
}
