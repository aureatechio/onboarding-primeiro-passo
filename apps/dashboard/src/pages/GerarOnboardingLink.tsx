import { useEffect, useMemo, useState } from 'react'
import { Copy, Link2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOnboardingEligiblePurchases } from '@/hooks/useOnboardingEligiblePurchases'

interface OnboardingPayload {
  compra_id: string
  clientName: string
  celebName: string
  praca: string
  segmento: string
  pacote: string
  vigencia: string
  atendente: string
}

interface OnboardingResponseSuccess {
  success: true
  data: OnboardingPayload
}

interface OnboardingResponseError {
  success: false
  code?: string
  message?: string
}
function isErrorResponse(
  value: OnboardingResponseSuccess | OnboardingResponseError
): value is OnboardingResponseError {
  return value.success === false
}


const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getOnboardingBaseUrl(): string {
  const configured = String(import.meta.env.VITE_ONBOARDING_BASE_URL ?? '').trim()
  if (configured) return configured
  return 'https://onboarding-primeiro-passo.vercel.app'
}

function getSupabaseUrl(): string {
  return String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
}

function buildOnboardingLink(compraId: string): string {
  const baseUrl = getOnboardingBaseUrl()
  const url = new URL(baseUrl)
  url.searchParams.set('compra_id', compraId)
  return url.toString()
}

export function GerarOnboardingLinkPage() {
  const [compraId, setCompraId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<OnboardingPayload | null>(null)
  const [link, setLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const {
    options: eligibleOptions,
    loading: eligibleLoading,
    error: eligibleError,
    fetchOptions: fetchEligibleOptions,
  } = useOnboardingEligiblePurchases()

  const onboardingBaseUrl = useMemo(() => getOnboardingBaseUrl(), [])
  const hasConfiguredOnboardingUrl = useMemo(
    () => String(import.meta.env.VITE_ONBOARDING_BASE_URL ?? '').trim().length > 0,
    []
  )

  useEffect(() => {
    void fetchEligibleOptions()
  }, [fetchEligibleOptions])

  const handleGenerate = async () => {
    const trimmedId = compraId.trim()
    setError(null)
    setCopied(false)
    setPayload(null)
    setLink('')

    if (!UUID_REGEX.test(trimmedId)) {
      setError('Informe um compra_id valido (UUID).')
      return
    }

    const supabaseUrl = getSupabaseUrl()
    if (!supabaseUrl) {
      setError('VITE_SUPABASE_URL nao configurada no dashboard.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-onboarding-data?compra_id=${encodeURIComponent(trimmedId)}`
      )
      const data = (await response.json()) as
        | OnboardingResponseSuccess
        | OnboardingResponseError

      if (!response.ok || isErrorResponse(data)) {
        setError(
          isErrorResponse(data)
            ? data.message ?? 'Nao foi possivel gerar link de onboarding.'
            : 'Nao foi possivel gerar link de onboarding.'
        )
        setLoading(false)
        return
      }

      setPayload(data.data)
      setLink(buildOnboardingLink(trimmedId))
      setLoading(false)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Erro inesperado ao validar compra.'
      )
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gerar Link de Onboarding</h2>
        <p className="text-muted-foreground">
          Gere manualmente o link do onboarding por compra_id para envio no WhatsApp.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Dados de entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="compra-id" className="text-sm font-medium">
              Compra elegivel
            </label>
            <Select
              value={compraId}
              onValueChange={(value) => {
                setCompraId(value)
                setError(null)
                setPayload(null)
                setLink('')
                setCopied(false)
              }}
              disabled={eligibleLoading || loading}
            >
              <SelectTrigger id="compra-id">
                <SelectValue
                  placeholder={
                    eligibleLoading ? 'Carregando compras...' : 'Selecione uma compra'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleOptions.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    Nenhuma compra elegivel encontrada
                  </SelectItem>
                ) : (
                  eligibleOptions.map((option) => (
                    <SelectItem key={option.compra_id} value={option.compra_id}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading || eligibleLoading || !compraId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Validando...' : 'Gerar link'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCompraId('')
                setError(null)
                setPayload(null)
                setLink('')
                setCopied(false)
              }}
              disabled={loading || eligibleLoading}
            >
              Limpar
            </Button>
          </div>

          {eligibleError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {eligibleError}
            </div>
          )}

          {!hasConfiguredOnboardingUrl && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              VITE_ONBOARDING_BASE_URL nao configurada. Usando fallback:{' '}
              <span className="font-mono">{onboardingBaseUrl}</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {payload && link && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Link de onboarding
              </p>
              <p className="break-all rounded-md border bg-muted/40 p-3 font-mono text-xs">
                {link}
              </p>
              <Button variant="outline" onClick={handleCopy} className="inline-flex gap-2">
                <Copy className="h-4 w-4" />
                {copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview da copy dinamica
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p><strong>Cliente:</strong> {payload.clientName}</p>
                <p><strong>Celebridade:</strong> {payload.celebName}</p>
                <p><strong>Praca:</strong> {payload.praca}</p>
                <p><strong>Segmento:</strong> {payload.segmento}</p>
                <p><strong>Pacote:</strong> {payload.pacote}</p>
                <p><strong>Vigencia:</strong> {payload.vigencia}</p>
                <p><strong>Atendente:</strong> {payload.atendente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
