import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface CompraRow {
  id: string
  cliente_id: string | null
  celebridade: string | null
  segmento: string | null
  descricao: string | null
  tempoocomprado: string | null
  vigencia_meses: number | null
  regiaocomprada: string | null
  checkout_status: string | null
  clicksign_status: string | null
  vendaaprovada: boolean | null
  valor_total: number | null
}

interface ClienteRow {
  nome: string | null
  nome_fantasia: string | null
  razaosocial: string | null
}

interface NomeRow {
  nome: string | null
}

interface AtendenteRow {
  nome: string
  genero: string
}

interface OnboardingIdentityRow {
  choice: string | null
  logo_path: string | null
  brand_palette: string[] | null
  font_choice: string | null
  campaign_images_paths: string[] | null
  campaign_notes: string | null
  production_path: string | null
  site_url: string | null
  instagram_handle: string | null
  updated_at: string | null
}

export interface IdentityPayload {
  choice: string | null
  logo_path: string | null
  brand_palette: string[]
  font_choice: string | null
  campaign_images_paths: string[]
  campaign_notes: string | null
  production_path: string | null
  site_url: string | null
  instagram_handle: string | null
  updated_at: string | null
}

export interface OnboardingDataPayload {
  compra_id: string
  clientName: string
  celebName: string
  praca: string
  segmento: string
  pacote: string
  vigencia: string
  atendente: string
  atendenteGenero: string
  identity: IdentityPayload | null
}

interface OnboardingLookupResult {
  found: boolean
  eligible: boolean
  data: OnboardingDataPayload | null
}

interface Dependencies {
  fetchOnboardingData: (compraId: string) => Promise<OnboardingLookupResult>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

export function formatVigencia(
  tempoocomprado: string | null,
  vigenciaMeses: number | null
): string {
  const byText = tempoocomprado?.trim()
  if (byText) return byText
  if (vigenciaMeses && Number.isFinite(vigenciaMeses) && vigenciaMeses > 0) {
    return `${vigenciaMeses} meses`
  }
  return 'Periodo contratado'
}

export function createDependencies(): Dependencies {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  return {
    fetchOnboardingData: async (
      compraId: string
    ): Promise<OnboardingLookupResult> => {
      const { data: compra, error: compraError } = await supabase
        .from('compras')
        .select(
          'id, cliente_id, celebridade, segmento, descricao, tempoocomprado, vigencia_meses, regiaocomprada, checkout_status, clicksign_status, vendaaprovada, valor_total'
        )
        .eq('id', compraId)
        .maybeSingle()

      if (compraError || !compra) {
        return { found: false, eligible: false, data: null }
      }

      const compraRow = compra as CompraRow
      const hasApprovedPayment =
        compraRow.checkout_status === 'pago' || compraRow.vendaaprovada === true
      const hasSignedContract = compraRow.clicksign_status === 'Assinado'
      const isEligible = hasApprovedPayment && hasSignedContract

      if (!isEligible) {
        return { found: true, eligible: false, data: null }
      }

      const valorTotal = Number(compraRow.valor_total ?? 0)

      const [clienteRes, atendenteRes, celebridadeRes, segmentoRes, identityRes] =
        await Promise.all([
          compraRow.cliente_id
            ? supabase
                .from('clientes')
                .select('nome, nome_fantasia, razaosocial')
                .eq('id', compraRow.cliente_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('atendentes')
            .select('nome, genero')
            .eq('ativo', true)
            .lte('valor_min', valorTotal)
            .or(`valor_max.is.null,valor_max.gte.${valorTotal}`)
            .order('valor_min', { ascending: false })
            .limit(1)
            .maybeSingle(),
          compraRow.celebridade
            ? supabase
                .from('celebridadesReferencia')
                .select('nome')
                .eq('id', compraRow.celebridade)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          compraRow.segmento
            ? supabase
                .from('segmentos')
                .select('nome')
                .eq('id', compraRow.segmento)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('onboarding_identity')
            .select(
              'choice, logo_path, brand_palette, font_choice, campaign_images_paths, campaign_notes, production_path, site_url, instagram_handle, updated_at'
            )
            .eq('compra_id', compraRow.id)
            .maybeSingle(),
        ])

      const cliente = (clienteRes.data as ClienteRow | null) ?? null
      const atendente = (atendenteRes.data as AtendenteRow | null) ?? null
      const celebridade = (celebridadeRes.data as NomeRow | null) ?? null
      const segmento = (segmentoRes.data as NomeRow | null) ?? null
      const identityRow = (identityRes.data as OnboardingIdentityRow | null) ?? null

      const identity: IdentityPayload | null = identityRow
        ? {
            choice: identityRow.choice ?? null,
            logo_path: identityRow.logo_path ?? null,
            brand_palette: identityRow.brand_palette ?? [],
            font_choice: identityRow.font_choice ?? null,
            campaign_images_paths: identityRow.campaign_images_paths ?? [],
            campaign_notes: identityRow.campaign_notes ?? null,
            production_path: identityRow.production_path ?? null,
            site_url: identityRow.site_url ?? null,
            instagram_handle: identityRow.instagram_handle ?? null,
            updated_at: identityRow.updated_at ?? null,
          }
        : null

      const data: OnboardingDataPayload = {
        compra_id: compraRow.id,
        clientName:
          cliente?.nome?.trim() ||
          cliente?.nome_fantasia?.trim() ||
          cliente?.razaosocial?.trim() ||
          'Cliente',
        celebName: celebridade?.nome?.trim() || 'Celebridade contratada',
        praca: compraRow.regiaocomprada?.trim() || 'Praca contratada',
        segmento: segmento?.nome?.trim() || 'Segmento contratado',
        pacote: compraRow.descricao?.trim() || 'Pacote contratado',
        vigencia: formatVigencia(compraRow.tempoocomprado, compraRow.vigencia_meses),
        atendente: atendente?.nome?.trim() || 'Equipe Acelerai',
        atendenteGenero: atendente?.genero ?? 'f',
        identity,
      }

      return {
        found: true,
        eligible: true,
        data,
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

  if (req.method !== 'GET') {
    return json(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metodo invalido. Use GET.',
      },
      405
    )
  }

  const url = new URL(req.url)
  const compraId = url.searchParams.get('compra_id')?.trim() ?? ''

  if (!compraId || !isValidUuid(compraId)) {
    return json(
      {
        success: false,
        code: 'INVALID_COMPRA_ID',
        message: 'compra_id invalido. Informe um UUID valido.',
      },
      400
    )
  }

  try {
    const result = await deps.fetchOnboardingData(compraId)

    if (!result.found) {
      return json(
        {
          success: false,
          code: 'COMPRA_NOT_FOUND',
          message: 'Compra nao encontrada.',
        },
        404
      )
    }

    if (!result.eligible) {
      return json(
        {
          success: false,
          code: 'COMPRA_NOT_ELIGIBLE',
          message: 'Compra ainda nao elegivel para onboarding.',
        },
        409
      )
    }

    return json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('[get-onboarding-data] unexpected error:', error)
    return json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Erro interno ao buscar dados do onboarding.',
      },
      500
    )
  }
}

Deno.serve((req) => handleRequest(req))
