import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_TEXT_LENGTH = 2000
const MAX_AUDIO_SIZE = 10 * 1024 * 1024
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
const BUCKET_NAME = 'onboarding-briefings'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface BriefingPayload {
  compra_id: string
  mode: 'text' | 'audio' | 'both'
  text?: string
  audio_duration_sec?: number
}

interface Dependencies {
  saveBriefing: (payload: BriefingPayload, audioFile?: File | null) => Promise<{
    success: boolean
    briefing_id?: string
    audio_path?: string
    error?: string
  }>
}

async function triggerAiCampaignJob(compraId: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[save-campaign-briefing] missing env for ai job trigger')
    return
  }

  const endpoint = `${supabaseUrl}/functions/v1/create-ai-campaign-job`
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
    throw new Error(`create-ai-campaign-job HTTP ${response.status}: ${body.substring(0, 200)}`)
  }

  const data = await response.json()
  console.log('[save-campaign-briefing] ai job trigger response:', {
    success: data?.success ?? false,
    status: data?.status ?? null,
    job_id: data?.job_id ?? null,
  })
}

function createDependencies(): Dependencies {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  return {
    saveBriefing: async (payload, audioFile) => {
      let audioPath: string | null = null

      if (audioFile) {
        const ext = audioFile.type.includes('webm') ? 'webm' : audioFile.type.includes('mp4') ? 'mp4' : 'audio'
        const filePath = `${payload.compra_id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, audioFile, {
            contentType: audioFile.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('[save-campaign-briefing] upload error:', uploadError)
          return { success: false, error: 'Falha no upload do audio.' }
        }

        audioPath = filePath
      }

      const { data, error } = await supabase
        .from('onboarding_briefings')
        .upsert(
          {
            compra_id: payload.compra_id,
            mode: payload.mode,
            brief_text: payload.text || null,
            audio_path: audioPath,
            audio_duration_sec: payload.audio_duration_sec || null,
            transcript: null,
            transcript_status: audioPath ? 'pending' : null,
            status: 'pending',
            error_code: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'compra_id' }
        )
        .select('id')
        .single()

      if (error) {
        console.error('[save-campaign-briefing] db error:', error)
        return { success: false, error: 'Falha ao salvar briefing.' }
      }

      return {
        success: true,
        briefing_id: data.id,
        audio_path: audioPath ?? undefined,
      }
    },
  }
}

export async function handleRequest(
  req: Request,
  deps: Dependencies = createDependencies()
): Promise<Response> {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let compraId: string
    let mode: string
    let text: string | undefined
    let audioDurationSec: number | undefined
    let audioFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      compraId = (formData.get('compra_id') as string)?.trim() ?? ''
      mode = (formData.get('mode') as string)?.trim() ?? ''
      text = (formData.get('text') as string) || undefined
      const durStr = formData.get('audio_duration_sec') as string
      audioDurationSec = durStr ? Number(durStr) : undefined
      audioFile = formData.get('audio') as File | null
    } else {
      const body = await req.json()
      compraId = (body.compra_id ?? '').trim()
      mode = (body.mode ?? '').trim()
      text = body.text
      audioDurationSec = body.audio_duration_sec
    }

    if (!compraId || !UUID_REGEX.test(compraId)) {
      return json({ success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id invalido.' }, 400)
    }

    if (!['text', 'audio', 'both'].includes(mode)) {
      return json({ success: false, code: 'INVALID_MODE', message: 'mode deve ser text, audio ou both.' }, 400)
    }

    if ((mode === 'text' || mode === 'both') && (!text || text.trim().length < 80)) {
      return json({ success: false, code: 'TEXT_TOO_SHORT', message: 'Texto do briefing muito curto (min. 80 caracteres).' }, 400)
    }

    if (text && text.length > MAX_TEXT_LENGTH) {
      return json({ success: false, code: 'TEXT_TOO_LONG', message: `Texto excede ${MAX_TEXT_LENGTH} caracteres.` }, 400)
    }

    if ((mode === 'audio' || mode === 'both') && audioFile) {
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return json({ success: false, code: 'AUDIO_TOO_LARGE', message: 'Audio excede 10 MB.' }, 400)
      }
      if (!ALLOWED_AUDIO_TYPES.some((t) => audioFile!.type.startsWith(t))) {
        return json({ success: false, code: 'INVALID_AUDIO_TYPE', message: 'Formato de audio nao suportado.' }, 400)
      }
    }

    if ((mode === 'audio' || mode === 'both') && !audioFile) {
      return json({ success: false, code: 'MISSING_AUDIO', message: 'Arquivo de audio obrigatorio para mode audio/both.' }, 400)
    }

    const result = await deps.saveBriefing(
      { compra_id: compraId, mode: mode as BriefingPayload['mode'], text, audio_duration_sec: audioDurationSec },
      audioFile
    )

    if (!result.success) {
      return json({ success: false, code: 'SAVE_ERROR', message: result.error ?? 'Erro ao salvar.' }, 500)
    }

    try {
      await triggerAiCampaignJob(compraId)
    } catch (error) {
      console.error('[save-campaign-briefing] trigger error:', error)
    }

    return json({
      success: true,
      data: {
        briefing_id: result.briefing_id,
        audio_path: result.audio_path ?? null,
        transcript_status: audioFile ? 'pending' : null,
      },
    })
  } catch (error) {
    console.error('[save-campaign-briefing] unexpected error:', error)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
}

Deno.serve((req) => handleRequest(req))
