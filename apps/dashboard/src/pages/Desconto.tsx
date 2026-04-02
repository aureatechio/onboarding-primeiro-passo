import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, CheckCircle2, Percent, Undo2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApplyDiscount } from '@/hooks/useApplyDiscount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
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

interface SessionPreview {
  id: string
  compra_id: string
  cliente_nome: string
  cliente_documento: string
  status: string
  metodo_pagamento: string
  valor_centavos: number
  valor_original_centavos: number
  desconto_aplicado_centavos: number
  desconto_percentual: number | null
  desconto_tipo: string | null
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

function statusVariant(
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
    case 'processing':
      return 'warning'
    case 'expired':
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function DescontoPage() {
  const [sessionId, setSessionId] = useState('')
  const [preview, setPreview] = useState<SessionPreview | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [percentual, setPercentual] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState('')

  const { loading, error, result, applyDiscount, reset } = useApplyDiscount()

  useEffect(() => {
    if (!dialogOpen) {
      setPassword('')
      reset()
    }
  }, [dialogOpen, reset])

  const handleSearch = async () => {
    const trimmed = sessionId.trim()
    if (!UUID_REGEX.test(trimmed)) {
      setSearchError('ID inválido. Use um UUID válido.')
      return
    }

    setSearching(true)
    setSearchError(null)
    setPreview(null)
    setPercentual('')

    const { data, error: fetchError } = await supabase
      .from('checkout_sessions')
      .select(
        'id, compra_id, cliente_nome, cliente_documento, status, metodo_pagamento, valor_centavos, valor_original_centavos, desconto_aplicado_centavos, desconto_percentual, desconto_tipo'
      )
      .eq('id', trimmed)
      .single()

    setSearching(false)

    if (fetchError || !data) {
      setSearchError('Sessão não encontrada.')
      return
    }

    setPreview(data as SessionPreview)
  }

  const parsedPercentual = useMemo(() => {
    const n = Number(percentual)
    if (!Number.isFinite(n) || n < 0 || n > 15) return null
    return n
  }, [percentual])

  const calculation = useMemo(() => {
    if (!preview || parsedPercentual == null) return null
    const valorOriginal =
      preview.valor_original_centavos ?? preview.valor_centavos
    const isRemoval = parsedPercentual === 0
    const desconto = isRemoval
      ? 0
      : Math.floor((valorOriginal * parsedPercentual) / 100)
    return {
      valorOriginal,
      desconto,
      valorFinal: valorOriginal - desconto,
      isRemoval,
    }
  }, [preview, parsedPercentual])

  const canApply = preview && ['pending', 'processing'].includes(preview.status)

  const handleApply = async () => {
    if (!preview || parsedPercentual == null) return
    const success = await applyDiscount(preview.id, parsedPercentual, password)
    if (success) {
      setPreview((prev) => {
        if (!prev || !calculation) return prev
        return {
          ...prev,
          valor_centavos: calculation.valorFinal,
          desconto_aplicado_centavos: calculation.desconto,
          desconto_percentual: calculation.isRemoval
            ? null
            : parsedPercentual,
          desconto_tipo: calculation.isRemoval ? null : 'pix_discount',
        }
      })
    }
  }

  const handleReset = () => {
    setSessionId('')
    setPreview(null)
    setSearchError(null)
    setPercentual('')
    reset()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aplicar Desconto</h2>
        <p className="text-muted-foreground">
          Aplique desconto percentual manual em uma sessão de checkout
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Buscar Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Checkout session ID (UUID)"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !searching) handleSearch()
              }}
              className="font-mono text-sm"
            />
            <Button onClick={handleSearch} disabled={searching || !sessionId.trim()}>
              {searching && <Loader2 className="h-4 w-4 animate-spin" />}
              {searching ? 'Buscando...' : 'Consultar'}
            </Button>
          </div>

          {searchError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dados da Sessão</CardTitle>
              <Badge variant={statusVariant(preview.status)}>
                {preview.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium">{preview.cliente_nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Documento</span>
                <p className="font-medium font-mono text-xs">
                  {preview.cliente_documento}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Método</span>
                <p className="font-medium capitalize">
                  {preview.metodo_pagamento}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Original</span>
                <p className="font-medium">
                  {formatBRL(
                    preview.valor_original_centavos ?? preview.valor_centavos
                  )}
                </p>
              </div>
            </div>

            {(preview.desconto_aplicado_centavos ?? 0) > 0 && (
              <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-sm">
                <span className="text-amber-700">
                  Desconto atual: {preview.desconto_percentual}% (
                  {formatBRL(preview.desconto_aplicado_centavos)}) — Pagando{' '}
                  {formatBRL(preview.valor_centavos)}
                </span>
              </div>
            )}

            <Separator />

            {!canApply ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Sessão com status &quot;{preview.status}&quot; não pode receber
                desconto. Apenas sessões pending/processing.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="desconto-percent"
                    className="text-sm font-medium"
                  >
                    Percentual de Desconto (0-15%)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="desconto-percent"
                      type="number"
                      min={0}
                      max={15}
                      step={1}
                      placeholder="Ex: 5"
                      value={percentual}
                      onChange={(e) => setPercentual(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use 0 para remover o desconto atual.
                  </p>
                </div>

                {calculation && parsedPercentual != null && (
                  <div className="rounded-md border bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Valor original
                      </span>
                      <span>{formatBRL(calculation.valorOriginal)}</span>
                    </div>
                    {!calculation.isRemoval && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Desconto ({parsedPercentual}%)</span>
                        <span>- {formatBRL(calculation.desconto)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Valor final</span>
                      <span
                        className={
                          calculation.isRemoval ? '' : 'text-emerald-700'
                        }
                      >
                        {formatBRL(calculation.valorFinal)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => setDialogOpen(true)}
                    disabled={parsedPercentual == null || percentual === ''}
                  >
                    {parsedPercentual === 0 ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <Percent className="h-4 w-4" />
                    )}
                    {parsedPercentual === 0
                      ? 'Remover Desconto'
                      : 'Aplicar Desconto'}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Limpar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Confirmar Desconto
            </DialogTitle>
            <DialogDescription>
              {parsedPercentual === 0
                ? 'O desconto será removido e o valor original restaurado.'
                : `Será aplicado ${parsedPercentual}% de desconto. Esta ação requer senha de admin.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {calculation && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{preview?.cliente_nome}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">De</span>
                  <span>
                    {formatBRL(
                      preview?.valor_original_centavos ??
                        preview?.valor_centavos ??
                        0
                    )}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Para</span>
                  <span className="font-bold text-emerald-700">
                    {formatBRL(calculation.valorFinal)}
                  </span>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {parsedPercentual === 0
                    ? 'Desconto removido com sucesso'
                    : 'Desconto aplicado com sucesso'}
                </div>
                <div className="text-xs text-emerald-600">
                  {formatBRL(result.before.valor_centavos)} &rarr;{' '}
                  {formatBRL(result.after.valor_centavos)}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!result && (
              <div className="space-y-2">
                <label
                  htmlFor="discount-password"
                  className="text-sm font-medium text-foreground"
                >
                  Senha de admin
                </label>
                <PasswordInput
                  id="discount-password"
                  placeholder="Digite a senha para confirmar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && !loading) {
                      handleApply()
                    }
                  }}
                  disabled={loading}
                  autoFocus
                />
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
                <Button
                  onClick={handleApply}
                  disabled={!password || loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Aplicando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
