import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  useReenviarContrato,
  type ClicksignSigner,
} from '@/hooks/useReenviarContrato'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CompraPreview {
  id: string
  cliente_id: string
  celebridade: string
  valor_total: number
  tempoocomprado: string
  regiaocomprada: string
  clicksign_status: string | null
  clicksign_error_message: string | null
  clicksign_envelope_id: string | null
  clicksign_signers: ClicksignSigner[] | null
}

interface ClientePreview {
  id: string
  nome: string
  razaosocial: string | null
  nome_fantasia: string | null
  email: string | null
  telefone: string | null
  cpf: string | null
  cnpj: string | null
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function clicksignBadgeVariant(
  status: string | null
): 'destructive' | 'warning' | 'success' | 'secondary' {
  if (status === 'error') return 'destructive'
  if (!status) return 'warning'
  if (status === 'Aguardando Assinatura') return 'success'
  if (status === 'Assinado') return 'success'
  return 'secondary'
}

function hasMinTwoWords(text: string): boolean {
  return text.trim().split(/\s+/).length >= 2
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

export function ReenviarContratoPage() {
  const [compraId, setCompraId] = useState('')
  const [compra, setCompra] = useState<CompraPreview | null>(null)
  const [cliente, setCliente] = useState<ClientePreview | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [nomeSignatario, setNomeSignatario] = useState('')
  const [emailSignatario, setEmailSignatario] = useState('')
  const [telefoneSignatario, setTelefoneSignatario] = useState('')
  const [modoNotificacao, setModoNotificacao] = useState<'single' | 'all'>(
    'single'
  )
  const [acaoDialog, setAcaoDialog] = useState<
    'notify' | 'notifyAll' | 'replace' | null
  >(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    loading,
    error,
    result,
    resendNotification,
    replaceSigner,
    reset,
  } = useReenviarContrato()

  useEffect(() => {
    if (!dialogOpen) reset()
  }, [dialogOpen, reset])

  const signerAtual = useMemo(() => {
    if (!compra?.clicksign_signers || compra.clicksign_signers.length === 0)
      return null
    return compra.clicksign_signers[0]
  }, [compra])

  const handleSearch = async () => {
    const trimmed = compraId.trim()
    if (!UUID_REGEX.test(trimmed)) {
      setSearchError('ID inválido. Use um UUID válido.')
      return
    }

    setSearching(true)
    setSearchError(null)
    setCompra(null)
    setCliente(null)
    setNomeSignatario('')
    setEmailSignatario('')
    setTelefoneSignatario('')
    setModoNotificacao('single')

    const { data: compraData, error: compraErr } = await supabase
      .from('compras')
      .select(
        'id, cliente_id, celebridade, valor_total, tempoocomprado, regiaocomprada, clicksign_status, clicksign_error_message, clicksign_envelope_id, clicksign_signers'
      )
      .eq('id', trimmed)
      .single()

    if (compraErr || !compraData) {
      setSearching(false)
      setSearchError('Compra não encontrada.')
      return
    }

    const { data: clienteData, error: clienteErr } = await supabase
      .from('clientes')
      .select(
        'id, nome, razaosocial, nome_fantasia, email, telefone, cpf, cnpj'
      )
      .eq('id', compraData.cliente_id)
      .single()

    setSearching(false)

    if (clienteErr || !clienteData) {
      setSearchError('Cliente não encontrado.')
      return
    }

    setCompra(compraData as CompraPreview)
    setCliente(clienteData as ClientePreview)
    const firstSigner =
      (compraData.clicksign_signers as ClicksignSigner[] | null)?.[0] ?? null
    const defaultName =
      firstSigner?.name || clienteData.razaosocial || clienteData.nome || ''
    const defaultEmail = firstSigner?.email || clienteData.email || ''
    const defaultPhone = firstSigner?.phone || clienteData.telefone || ''
    setNomeSignatario(defaultName)
    setEmailSignatario(defaultEmail)
    setTelefoneSignatario(defaultPhone)
  }

  const nomeOriginal = signerAtual?.name || (cliente ? cliente.razaosocial || cliente.nome : '')
  const emailOriginal = signerAtual?.email || cliente?.email || ''
  const telefoneOriginal = signerAtual?.phone || cliente?.telefone || ''
  const nomeAlterado = normalizeName(nomeSignatario) !== normalizeName(nomeOriginal)
  const emailAlterado = normalizeEmail(emailSignatario) !== normalizeEmail(emailOriginal)
  const telefoneAlterado =
    normalizePhone(telefoneSignatario) !== normalizePhone(telefoneOriginal)
  const nomeValido = hasMinTwoWords(nomeSignatario)
  const emailValido = EMAIL_REGEX.test(emailSignatario.trim())
  const telefoneValido =
    telefoneSignatario.trim().length === 0 ||
    (normalizePhone(telefoneSignatario).length >= 10 &&
      normalizePhone(telefoneSignatario).length <= 11)
  const anySignerFieldChanged = nomeAlterado || emailAlterado || telefoneAlterado

  const canNotify = useMemo(() => {
    if (!compra?.clicksign_envelope_id) return false
    if (compra.clicksign_status === 'Assinado') return false
    if (modoNotificacao === 'single' && !signerAtual?.signer_key) return false
    if (anySignerFieldChanged) return false
    if (loading) return false
    return true
  }, [compra, modoNotificacao, signerAtual, anySignerFieldChanged, loading])

  const canReplace = useMemo(() => {
    if (!compra?.clicksign_envelope_id) return false
    if (!signerAtual?.signer_key) return false
    if (!anySignerFieldChanged) return false
    if (!nomeValido || !emailValido || !telefoneValido) return false
    if (compra.clicksign_status === 'Assinado') return false
    if (loading) return false
    return true
  }, [
    compra,
    signerAtual,
    anySignerFieldChanged,
    nomeValido,
    emailValido,
    telefoneValido,
    loading,
  ])

  const handleConfirmAction = async () => {
    if (!compra) return

    if (acaoDialog === 'notify' || acaoDialog === 'notifyAll') {
      const mode = acaoDialog === 'notifyAll' ? 'all' : 'single'
      const success = await resendNotification({
        compraId: compra.id,
        mode,
        signerId: mode === 'single' ? signerAtual?.signer_key : undefined,
      })
      if (success) {
        setCompra((prev) =>
          prev
            ? {
                ...prev,
                clicksign_status:
                  prev.clicksign_status === 'Assinado'
                    ? prev.clicksign_status
                    : 'Aguardando Assinatura',
                clicksign_error_message: null,
              }
            : prev
        )
      }
      return
    }

    if (acaoDialog === 'replace' && signerAtual?.signer_key) {
      const success = await replaceSigner({
        compraId: compra.id,
        oldSignerId: signerAtual.signer_key,
        newName: nomeSignatario.trim(),
        newEmail: emailSignatario.trim(),
        newPhone: telefoneSignatario.trim() || undefined,
        notify: true,
      })
      if (success) {
        await handleSearch()
      }
    }
  }

  const handleReset = () => {
    setCompraId('')
    setCompra(null)
    setCliente(null)
    setSearchError(null)
    setNomeSignatario('')
    setEmailSignatario('')
    setTelefoneSignatario('')
    setModoNotificacao('single')
    setAcaoDialog(null)
    reset()
  }

  const statusBlocked = compra?.clicksign_status === 'Assinado'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Reenviar Contrato
        </h2>
        <p className="text-muted-foreground">
          Reenvie notificações e ajuste signatário sem recriar envelope na ClickSign
        </p>
      </div>

      {/* Bloco 1: Busca */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Buscar Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="compra_id (UUID)"
              value={compraId}
              onChange={(e) => setCompraId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !searching) handleSearch()
              }}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !compraId.trim()}
            >
              {searching && <Loader2 className="h-4 w-4 animate-spin" />}
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {searchError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloco 2: Preview + Edicao */}
      {compra && cliente && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dados do Contrato</CardTitle>
              <Badge variant={clicksignBadgeVariant(compra.clicksign_status)}>
                {compra.clicksign_status || 'Não enviado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium">{cliente.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CNPJ/CPF</span>
                <p className="font-medium font-mono text-xs">
                  {cliente.cnpj || cliente.cpf || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium text-xs">
                  {cliente.email || (
                    <span className="text-red-600">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone</span>
                <p className="font-medium">
                  {cliente.telefone || (
                    <span className="text-red-600">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor</span>
                <p className="font-medium">{formatBRL(compra.valor_total)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Região</span>
                <p className="font-medium">{compra.regiaocomprada || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tempo</span>
                <p className="font-medium">{compra.tempoocomprado || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Razão Social</span>
                <p className="font-medium font-mono text-xs">
                  {cliente.razaosocial || '—'}
                </p>
              </div>
            </div>

            {compra.clicksign_error_message && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <span className="font-medium">Erro ClickSign: </span>
                {compra.clicksign_error_message}
              </div>
            )}

            <Separator />

            {statusBlocked ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Contrato com status &quot;{compra.clicksign_status}&quot; não
                permite atualização operacional nesta tela.
              </div>
            ) : (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-medium">Envelope atual</p>
                  <p className="font-mono break-all">
                    {compra.clicksign_envelope_id || 'Sem envelope'}
                  </p>
                  <p className="text-muted-foreground">
                    Signer atual:{' '}
                    <span className="font-mono">
                      {signerAtual?.signer_key || 'Sem signatário vinculado'}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="modo-notificacao"
                    className="text-sm font-medium"
                  >
                    Modo de notificação
                  </label>
                  <div
                    id="modo-notificacao"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Button
                      type="button"
                      variant={
                        modoNotificacao === 'single' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setModoNotificacao('single')}
                    >
                      Signatário atual
                    </Button>
                    <Button
                      type="button"
                      variant={
                        modoNotificacao === 'all' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setModoNotificacao('all')}
                    >
                      Todos do envelope
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="nome-signatario"
                    className="text-sm font-medium"
                  >
                    Nome do Signatário
                  </label>
                  <Input
                    id="nome-signatario"
                    placeholder="Ex: Genesis Consultoria Contabil LTDA"
                    value={nomeSignatario}
                    onChange={(e) => setNomeSignatario(e.target.value)}
                    className={
                      nomeSignatario && !nomeValido
                        ? 'border-red-300 focus-visible:ring-red-400'
                        : ''
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    A ClickSign exige no mínimo 2 palavras.{' '}
                    {nomeAlterado && (
                      <span className="text-amber-600">
                        (alterado do original: &quot;{nomeOriginal}&quot;)
                      </span>
                    )}
                  </p>
                  {nomeSignatario && !nomeValido && (
                    <p className="text-xs text-red-600">
                      Nome precisa ter pelo menos 2 palavras.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email-signatario"
                    className="text-sm font-medium"
                  >
                    E-mail do Signatário
                  </label>
                  <Input
                    id="email-signatario"
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={emailSignatario}
                    onChange={(e) => setEmailSignatario(e.target.value)}
                    className={
                      emailSignatario && !emailValido
                        ? 'border-red-300 focus-visible:ring-red-400'
                        : ''
                    }
                  />
                  {emailSignatario && !emailValido && (
                    <p className="text-xs text-red-600">
                      Informe um e-mail válido.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="telefone-signatario"
                    className="text-sm font-medium"
                  >
                    Telefone do Signatário
                  </label>
                  <Input
                    id="telefone-signatario"
                    placeholder="(11) 99888-7766"
                    value={telefoneSignatario}
                    onChange={(e) => setTelefoneSignatario(e.target.value)}
                    className={
                      telefoneSignatario && !telefoneValido
                        ? 'border-red-300 focus-visible:ring-red-400'
                        : ''
                    }
                  />
                  {telefoneSignatario && !telefoneValido && (
                    <p className="text-xs text-red-600">
                      Informe telefone com 10 ou 11 dígitos (DDD + número).
                    </p>
                  )}
                </div>

                {anySignerFieldChanged && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    Você alterou os dados do signatário. Para enviar ao novo e-mail, use
                    <span className="font-semibold"> Alterar Signatário e Reenviar</span>.
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      setAcaoDialog(
                        modoNotificacao === 'all' ? 'notifyAll' : 'notify'
                      )
                      setDialogOpen(true)
                    }}
                    disabled={!canNotify}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {modoNotificacao === 'all'
                      ? 'Reenviar para todos'
                      : 'Reenviar para signatário atual'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAcaoDialog('replace')
                      setDialogOpen(true)
                    }}
                    disabled={!canReplace}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Alterar Signatário e Reenviar
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={loading}>
                    Limpar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bloco 3: Dialog de Confirmacao */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Confirmar ação operacional
            </DialogTitle>
            <DialogDescription>
              {acaoDialog === 'replace'
                ? 'O signatário será atualizado no envelope atual e uma notificação será enviada.'
                : 'Uma nova notificação será enviada no envelope atual sem recriar contrato.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {compra && cliente && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compra</span>
                  <span className="font-mono text-xs">{compra.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{cliente.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envelope</span>
                  <span className="font-mono text-xs">
                    {compra.clicksign_envelope_id || '—'}
                  </span>
                </div>
                {nomeAlterado && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome antigo</span>
                      <span className="text-red-600 line-through">
                        {nomeOriginal}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome novo</span>
                      <span className="font-bold text-emerald-700">
                        {nomeSignatario}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email novo</span>
                  <span className="font-medium">{emailSignatario || '—'}</span>
                </div>
                {!nomeAlterado && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signatário</span>
                    <span className="font-medium">{nomeSignatario}</span>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ação executada com sucesso
                </div>
                <div className="text-xs text-emerald-600">
                  Envelope: {result.envelope_id}
                </div>
              </div>
            )}

            {result &&
              'new_signer_id' in result &&
              (result.notify_warning || result.crm_sync_warning) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Operação concluída com alerta
                  </div>
                  {result.notify_warning && (
                    <div className="text-xs text-amber-700">{result.notify_warning}</div>
                  )}
                  {result.crm_sync_warning && (
                    <div className="text-xs text-amber-700">{result.crm_sync_warning}</div>
                  )}
                </div>
              )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            {result ? (
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Fechar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleConfirmAction} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Enviando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
