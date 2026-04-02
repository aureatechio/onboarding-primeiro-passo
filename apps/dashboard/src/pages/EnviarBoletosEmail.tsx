import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Search,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { validateEmailFormat } from '@/lib/mask'
import { cn } from '@/lib/utils'
import { useEnviarBoletosEmail } from '@/hooks/useEnviarBoletosEmail'

type FieldErrors = {
  compraId?: string
  email?: string
  nome?: string
  ccEmails?: string
  subject?: string
}

const DEFAULT_SUBJECT = 'Seus boletos e detalhes da proposta'

function parseCcEmails(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function maskEmailAddress(email: string): string {
  const normalized = email.trim()
  if (!normalized.includes('@')) return normalized

  const [local, domain] = normalized.split('@')
  if (!local || !domain) return normalized
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`

  return `${local.slice(0, 2)}***@${domain}`
}

function formatSentAt(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed)
}

export function EnviarBoletosEmailPage() {
  const [compraId, setCompraId] = useState('')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [ccEmailsRaw, setCcEmailsRaw] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSentLocked, setIsSentLocked] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const {
    fetchLoading,
    sendLoading,
    fetchError,
    sendError,
    data,
    result,
    buscarDados,
    enviar,
    resetFeedback,
  } = useEnviarBoletosEmail()
  const toast = useToast()
  const copyToClipboard = useCopyToClipboard()

  const ccEmails = useMemo(() => parseCcEmails(ccEmailsRaw), [ccEmailsRaw])
  const invalidCcEmails = useMemo(
    () => ccEmails.filter((cc) => !validateEmailFormat(cc).valid),
    [ccEmails]
  )

  const emailValidation = useMemo(
    () => validateEmailFormat(email.trim()),
    [email]
  )
  const isEmailValid = email.trim().length > 0 && emailValidation.valid
  const isNomeValid = nome.trim().length >= 2
  const isSubjectValid =
    subject.trim().length >= 3 && subject.trim().length <= 120

  const canSend =
    !!data &&
    !sendLoading &&
    !fetchLoading &&
    !isSentLocked &&
    compraId.trim().length > 0 &&
    isEmailValid &&
    isNomeValid &&
    isSubjectValid &&
    invalidCcEmails.length === 0

  const validateBeforeFetch = (): boolean => {
    const nextErrors: FieldErrors = {}

    if (!compraId.trim()) {
      nextErrors.compraId = 'compra_id é obrigatório'
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const validateBeforeSend = (): boolean => {
    const nextErrors: FieldErrors = {}

    if (!compraId.trim()) {
      nextErrors.compraId = 'compra_id é obrigatório'
    }

    if (!email.trim()) {
      nextErrors.email = 'Email é obrigatório'
    } else {
      const emailCheck = validateEmailFormat(email.trim())
      if (!emailCheck.valid) nextErrors.email = emailCheck.error
    }

    if (!nome.trim()) {
      nextErrors.nome = 'Nome é obrigatório'
    } else if (nome.trim().length < 2) {
      nextErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
    }

    const invalidCc = ccEmails.find((cc) => !validateEmailFormat(cc).valid)
    if (invalidCc) {
      nextErrors.ccEmails = `Email em cópia inválido: ${invalidCc}`
    }

    const trimmedSubject = subject.trim()
    if (trimmedSubject.length < 3 || trimmedSubject.length > 120) {
      nextErrors.subject = 'Assunto deve ter entre 3 e 120 caracteres'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateEmailField = () => {
    const value = email.trim()
    if (!value) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email é obrigatório' }))
      return
    }

    const check = validateEmailFormat(value)
    setFieldErrors((prev) => ({
      ...prev,
      email: check.valid ? undefined : check.error,
    }))
  }

  const validateCcField = () => {
    const invalidCc = ccEmails.find((cc) => !validateEmailFormat(cc).valid)
    setFieldErrors((prev) => ({
      ...prev,
      ccEmails: invalidCc ? `Email em cópia inválido: ${invalidCc}` : undefined,
    }))
  }

  const validateSubjectField = () => {
    const trimmedSubject = subject.trim()
    if (trimmedSubject.length < 3 || trimmedSubject.length > 120) {
      setFieldErrors((prev) => ({
        ...prev,
        subject: 'Assunto deve ter entre 3 e 120 caracteres',
      }))
      return
    }

    setFieldErrors((prev) => ({ ...prev, subject: undefined }))
  }

  const handleBuscarDados = async () => {
    resetFeedback()
    if (!validateBeforeFetch()) return

    const fetched = await buscarDados(compraId.trim())
    if (!fetched) {
      setEmail('')
      setNome('')
      setSubject(DEFAULT_SUBJECT)
      setCcEmailsRaw('')
      setIsSentLocked(false)
      setFieldErrors({})
      toast.error({
        title: 'Falha ao buscar dados',
        description: 'Compra não encontrada ou erro ao buscar dados.',
      })
      return
    }

    setEmail(fetched.email)
    setNome(fetched.nome)
    setSubject(fetched.subject || DEFAULT_SUBJECT)
    setFieldErrors({})
    setIsSentLocked(false)
    toast.info({
      title: 'Dados carregados',
      description: `${fetched.boletoCount} boletos encontrados para esta compra.`,
    })
  }

  const handleEnviar = async () => {
    resetFeedback()
    if (!data) return
    if (!validateBeforeSend()) return

    const sent = await enviar({
      compraId: compraId.trim(),
      email: email.trim(),
      nome: nome.trim(),
      ccEmails,
      subject: subject.trim(),
    })

    if (!sent) {
      toast.error({
        title: 'Falha ao enviar email',
        description: 'Revise os dados e tente novamente.',
      })
      return
    }

    setIsSentLocked(true)
    toast.success({
      title: 'Email enviado',
      description: `Email enviado para ${maskEmailAddress(email)} com ${
        data.boletoCount
      } boletos.`,
    })
  }

  const handleCopyBoletoLink = async (url: string, index: number) => {
    const success = await copyToClipboard(url)
    if (!success) {
      toast.error({
        title: 'Falha ao copiar',
        description: `Não foi possível copiar o link do boleto ${index + 1}.`,
      })
      return
    }

    setCopiedIndex(index)
    window.setTimeout(() => {
      setCopiedIndex((current) => (current === index ? null : current))
    }, 1200)
    toast.success({
      title: 'Link copiado',
      description: `O link do boleto ${index + 1} foi copiado.`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Enviar Boletos por Email
        </h2>
        <p className="text-muted-foreground">
          Busque os dados por compra_id, ajuste os campos e envie os boletos para o
          cliente.
        </p>
      </div>

      <div className="grid items-start gap-6 min-[1100px]:grid-cols-2">
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Dados do envio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="compra-id" className="text-sm font-medium">
                  compra_id
                </label>
                <div className="flex gap-2">
                  <Input
                    id="compra-id"
                    placeholder="UUID da compra"
                    value={compraId}
                    onChange={(e) => {
                      setCompraId(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, compraId: undefined }))
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleBuscarDados}
                    disabled={fetchLoading || sendLoading}
                  >
                    {fetchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!fetchLoading && <Search className="h-4 w-4" />}
                    {fetchLoading ? 'Buscando...' : 'Buscar dados'}
                  </Button>
                </div>
                {fieldErrors.compraId && (
                  <p className="text-xs text-red-600">{fieldErrors.compraId}</p>
                )}
                {fetchError && (
                  <p className="text-xs text-red-600">
                    {fetchError.includes('não encontrados')
                      ? 'Compra não encontrada.'
                      : fetchError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="recipient-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="recipient-email"
                  placeholder="cliente@exemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setIsSentLocked(false)
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  onBlur={validateEmailField}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="recipient-name" className="text-sm font-medium">
                  Nome do cliente
                </label>
                <Input
                  id="recipient-name"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    setIsSentLocked(false)
                    setFieldErrors((prev) => ({ ...prev, nome: undefined }))
                  }}
                  onBlur={() => {
                    const trimmed = nome.trim()
                    setFieldErrors((prev) => ({
                      ...prev,
                      nome:
                        trimmed.length >= 2
                          ? undefined
                          : 'Nome deve ter pelo menos 2 caracteres',
                    }))
                  }}
                />
                {fieldErrors.nome && (
                  <p className="text-xs text-red-600">{fieldErrors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Assunto
                </label>
                <Input
                  id="subject"
                  placeholder="Assunto do email"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value)
                    setIsSentLocked(false)
                    setFieldErrors((prev) => ({ ...prev, subject: undefined }))
                  }}
                  onBlur={validateSubjectField}
                />
                {fieldErrors.subject && (
                  <p className="text-xs text-red-600">{fieldErrors.subject}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="cc-emails" className="text-sm font-medium">
                  Emails em cópia (CC)
                </label>
                <Input
                  id="cc-emails"
                  placeholder="financeiro@empresa.com, gestor@empresa.com"
                  value={ccEmailsRaw}
                  onChange={(e) => {
                    setCcEmailsRaw(e.target.value)
                    setIsSentLocked(false)
                    setFieldErrors((prev) => ({ ...prev, ccEmails: undefined }))
                  }}
                  onBlur={validateCcField}
                />
                <p className="text-xs text-slate-600">
                  Separe múltiplos emails com vírgula, ponto e vírgula ou quebra de
                  linha.
                </p>
                {ccEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ccEmails.map((cc) => {
                      const valid = validateEmailFormat(cc).valid
                      return (
                        <span
                          key={cc}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs',
                            valid
                              ? 'border-slate-200 bg-slate-50 text-slate-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          )}
                        >
                          {cc}
                        </span>
                      )
                    })}
                  </div>
                )}
                {fieldErrors.ccEmails && (
                  <p className="text-xs text-red-600">{fieldErrors.ccEmails}</p>
                )}
              </div>

              {data && (
                <div className="rounded-md border border-[#d1e2ff] bg-[#eff4ff] p-4 text-sm">
                  <p className="mb-1">
                    <strong>Assunto:</strong> {subject.trim() || DEFAULT_SUBJECT}
                  </p>
                  <p className="mb-1">
                    <strong>Proposta:</strong> {data.propostaDescricao}
                  </p>
                  <p className="mb-1">
                    <strong>Valor da venda:</strong> {data.valorVendaFormatado}
                  </p>
                  <p className="mb-1">
                    <strong>Valor da parcela:</strong> {data.valorFormatado}
                  </p>
                  <p className="mb-0">
                    <strong>Quantidade de boletos:</strong> {data.boletoCount}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" onClick={handleEnviar} disabled={!canSend}>
                  {sendLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!sendLoading && <Send className="h-4 w-4" />}
                  {sendLoading
                    ? 'Enviando...'
                    : isSentLocked
                      ? 'Email já enviado'
                      : 'Enviar email'}
                </Button>
              </div>

              {isSentLocked && (
                <p className="text-xs text-amber-700">
                  Envio bloqueado para evitar duplicidade. Altere um campo ou faça uma
                  nova busca para reenviar.
                </p>
              )}

              {result && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {result.message} Audit ID:{' '}
                  <span className="font-mono">{result.auditId}</span>
                </div>
              )}

              {sendError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {sendError}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>URLs dos boletos</span>
                {data && data.boletoCount > 0 && (
                  <Badge variant="secondary">{data.boletoCount} boletos encontrados</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data && (
                <p className="text-sm text-muted-foreground">
                  Informe um compra_id e clique em Buscar dados para carregar os links.
                </p>
              )}

              {data && data.boletoUrls.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum boleto encontrado para esta compra.
                </p>
              )}

              {data && data.boletoUrls.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {data.boletoUrls.map((url, index) => (
                    <li
                      key={`${url}-${index}`}
                      className="rounded-md border bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-slate-900">
                            <FileText className="h-4 w-4 text-[#384FFE]" />
                            Boleto {index + 1}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {url}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button asChild variant="outline" size="sm">
                            <a href={url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyBoletoLink(url, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            Copiar link
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {data && (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Histórico recente de envios</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentSends.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum envio anterior encontrado para este compra_id.
                  </p>
                )}

                {data.recentSends.length > 0 && (
                  <ul className="space-y-3">
                    {data.recentSends.map((item, index) => (
                      <li key={item.auditId} className="rounded-md border p-3 text-sm">
                        <p className="font-medium text-slate-900">
                          {index === 0 ? 'Último envio' : `Envio ${index + 1}`}
                        </p>
                        <p className="text-muted-foreground">
                          {formatSentAt(item.sentAt)} por{' '}
                          {item.sentByUserEmail || 'Usuário não identificado'} para{' '}
                          {maskEmailAddress(item.recipientEmail)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Audit ID: <span className="font-mono">{item.auditId}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <div className="min-[1100px]:hidden">
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  {previewOpen ? 'Ocultar preview do email' : 'Ver preview do email'}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      previewOpen && 'rotate-180'
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-base">Preview do email</CardTitle>
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
                        {subject.trim() || DEFAULT_SUBJECT}
                      </h3>
                      <p className="mb-3">
                        Olá,{' '}
                        <span className="rounded bg-[#eff4ff] px-1.5 py-0.5 font-medium text-[#1d2d7a]">
                          {nome.trim() || data?.nome || 'Cliente'}
                        </span>
                        .
                      </p>
                      <p className="mb-4">
                        Segue abaixo os boletos e os detalhes da sua proposta.
                      </p>
                      <div className="mb-4 rounded-md border border-[#d1e2ff] bg-[#eff4ff] p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#384FFE]">
                          Resumo da proposta
                        </p>
                        <p className="mb-1">
                          <strong>Proposta:</strong>{' '}
                          {data?.propostaDescricao || 'Proposta comercial AUREA'}
                        </p>
                        <p className="mb-1">
                          <strong>Valor da venda:</strong>{' '}
                          {data?.valorVendaFormatado || 'Valor indisponível'}
                        </p>
                        <p className="mb-1">
                          <strong>Valor da parcela:</strong>{' '}
                          {data?.valorFormatado || 'Valor indisponível'}
                        </p>
                        <p className="mb-0">
                          <strong>Quantidade de boletos:</strong> {data?.boletoCount ?? 0}
                        </p>
                      </div>

                      <p className="mb-2 font-semibold">Links dos boletos</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {(data?.boletoUrls ?? []).map((url, index) => (
                          <li key={`${url}-preview-mobile-${index}`}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#384FFE] underline"
                            >
                              Abrir boleto {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>

                      {ccEmails.length > 0 && (
                        <p className="mt-4 text-xs text-slate-600">
                          Cópia para:{' '}
                          <span className="rounded bg-[#eff4ff] px-1.5 py-0.5">
                            {ccEmails.join(', ')}
                          </span>
                        </p>
                      )}

                      <p className="mt-4 text-xs text-slate-500">
                        Se você não reconhece este envio, ignore este email.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Card className="hidden h-fit min-[1100px]:block">
            <CardHeader>
              <CardTitle className="text-base">Preview do email</CardTitle>
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
                  {subject.trim() || DEFAULT_SUBJECT}
                </h3>
                <p className="mb-3">
                  Olá,{' '}
                  <span className="rounded bg-[#eff4ff] px-1.5 py-0.5 font-medium text-[#1d2d7a]">
                    {nome.trim() || data?.nome || 'Cliente'}
                  </span>
                  .
                </p>
                <p className="mb-4">Segue abaixo os boletos e os detalhes da sua proposta.</p>
                <div className="mb-4 rounded-md border border-[#d1e2ff] bg-[#eff4ff] p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#384FFE]">
                    Resumo da proposta
                  </p>
                  <p className="mb-1">
                    <strong>Proposta:</strong>{' '}
                    {data?.propostaDescricao || 'Proposta comercial AUREA'}
                  </p>
                  <p className="mb-1">
                    <strong>Valor da venda:</strong>{' '}
                    {data?.valorVendaFormatado || 'Valor indisponível'}
                  </p>
                  <p className="mb-1">
                    <strong>Valor da parcela:</strong>{' '}
                    {data?.valorFormatado || 'Valor indisponível'}
                  </p>
                  <p className="mb-0">
                    <strong>Quantidade de boletos:</strong> {data?.boletoCount ?? 0}
                  </p>
                </div>

                <p className="mb-2 font-semibold">Links dos boletos</p>
                <ul className="list-disc space-y-1 pl-5">
                  {(data?.boletoUrls ?? []).map((url, index) => (
                    <li key={`${url}-preview-desktop-${index}`}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#384FFE] underline"
                      >
                        Abrir boleto {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>

                {ccEmails.length > 0 && (
                  <p className="mt-4 text-xs text-slate-600">
                    Cópia para:{' '}
                    <span className="rounded bg-[#eff4ff] px-1.5 py-0.5">
                      {ccEmails.join(', ')}
                    </span>
                  </p>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  Se você não reconhece este envio, ignore este email.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
