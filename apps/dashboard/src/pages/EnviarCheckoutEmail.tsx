import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateEmailFormat } from '@/lib/mask'
import { useEnviarCheckoutEmail } from '@/hooks/useEnviarCheckoutEmail'

type FieldErrors = {
  email?: string
  nome?: string
  checkoutLink?: string
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function EnviarCheckoutEmailPage() {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [checkoutLink, setCheckoutLink] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const {
    loading,
    error,
    result,
    previewLoading,
    previewError,
    preview,
    enviar,
    carregarPreview,
    clearPreview,
    reset,
  } = useEnviarCheckoutEmail()

  const previewName = useMemo(
    () => preview?.nomeDestinatario || nome.trim() || 'Cliente',
    [preview?.nomeDestinatario, nome]
  )
  const previewLink = useMemo(
    () =>
      preview?.checkoutLink ||
      checkoutLink.trim() ||
      'https://checkout.seudominio.com/?session=00000000-0000-0000-0000-000000000000',
    [preview?.checkoutLink, checkoutLink]
  )

  useEffect(() => {
    const trimmedLink = checkoutLink.trim()
    if (!trimmedLink) {
      clearPreview()
      return
    }

    void carregarPreview({
      nome: nome.trim(),
      checkoutLink: trimmedLink,
    })
  }, [nome, checkoutLink, carregarPreview, clearPreview])

  const validateForm = (): boolean => {
    const nextErrors: FieldErrors = {}
    const emailCheck = validateEmailFormat(email.trim())
    const trimmedNome = nome.trim()
    const trimmedLink = checkoutLink.trim()

    if (!email.trim()) {
      nextErrors.email = 'Email é obrigatório'
    } else if (!emailCheck.valid) {
      nextErrors.email = emailCheck.error
    }

    if (!trimmedNome) {
      nextErrors.nome = 'Nome é obrigatório'
    } else if (trimmedNome.length < 2) {
      nextErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
    }

    if (!trimmedLink) {
      nextErrors.checkoutLink = 'Link de checkout é obrigatório'
    } else if (!isHttpUrl(trimmedLink)) {
      nextErrors.checkoutLink = 'Informe uma URL válida com http/https'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    reset()
    if (!validateForm()) return

    await enviar({
      email: email.trim(),
      nome: nome.trim(),
      checkoutLink: checkoutLink.trim(),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Enviar Link de Checkout
        </h2>
        <p className="text-muted-foreground">
          Envio manual de email com link de checkout para clientes.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Dados do envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="recipient-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="recipient-email"
              placeholder="cliente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="recipient-name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="recipient-name"
              placeholder="Maria Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            {fieldErrors.nome && (
              <p className="text-xs text-red-600">{fieldErrors.nome}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="checkout-link" className="text-sm font-medium">
              Link de checkout
            </label>
            <Input
              id="checkout-link"
              placeholder="https://checkout.seudominio.com/session/abc123"
              value={checkoutLink}
              onChange={(e) => setCheckoutLink(e.target.value)}
            />
            {fieldErrors.checkoutLink && (
              <p className="text-xs text-red-600">{fieldErrors.checkoutLink}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar email'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEmail('')
                setNome('')
                setCheckoutLink('')
                setFieldErrors({})
                reset()
                clearPreview()
              }}
              disabled={loading}
            >
              Limpar
            </Button>
          </div>

          {result && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {result.message} Audit ID: <span className="font-mono">{result.auditId}</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Preview do email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-full max-w-[600px] rounded-md border bg-white p-6 text-sm text-slate-800">
            <div className="mb-5 border-b pb-4">
              <img
                src="https://acelerai-checkout.vercel.app/assets/image/logo_acelerai.png"
                alt="Acelerai"
                className="h-auto w-full max-w-[170px]"
              />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[#191919]">
              Seu link de checkout
            </h3>
            <p className="mb-3">Olá, {previewName}.</p>
            <p className="mb-4">
              Segue o resumo da sua proposta e o link para concluir o pagamento.
            </p>
            <div className="mb-4 rounded-md border border-[#d1e2ff] bg-[#eff4ff] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#384FFE]">
                Resumo da proposta
              </p>
              <p className="mb-1">
                <strong>Proposta:</strong>{' '}
                {preview?.propostaDescricao || 'Proposta comercial AUREA'}
              </p>
              <p className="mb-1">
                <strong>Valor:</strong>{' '}
                {preview?.valorFormatado || 'Valor disponível no checkout'}
              </p>
              <p className="mb-1">
                <strong>Métodos disponíveis:</strong>{' '}
                {(preview?.metodosDisponiveis || ['PIX', 'Cartão de crédito', 'Boleto']).join(
                  ', '
                )}
              </p>
              <p className="mb-0 text-xs text-[#6d6d6d]">
                Origem dos dados: {preview?.source === 'session' ? 'sessão' : 'fallback'}
                {preview?.sessionId ? ` (${preview.sessionId})` : ''}
              </p>
            </div>
            <a
              href={previewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md bg-[#FF0058] px-4 py-2 font-semibold text-white"
            >
              Acessar checkout
            </a>
            <p className="mt-5 break-all text-xs text-slate-600">{previewLink}</p>
            {previewLoading && (
              <p className="mt-2 text-xs text-[#384FFE]">
                Carregando dados da sessão para o preview...
              </p>
            )}
            {previewError && <p className="mt-2 text-xs text-red-600">{previewError}</p>}
            <p className="mt-4 text-xs text-slate-500">
              Se você não reconhece este envio, ignore este email.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
