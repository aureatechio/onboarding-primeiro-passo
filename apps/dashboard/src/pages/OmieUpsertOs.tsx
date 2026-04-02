import { useMemo, useState } from 'react'
import { CheckCircle2, FileJson, Loader2, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOmieUpsertOs } from '@/hooks/useOmieUpsertOs'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function OmieUpsertOsPage() {
  const [compraId, setCompraId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const {
    loadingPreview,
    loadingExecute,
    loadingAudit,
    loadingSync,
    error,
    technicalError,
    preview,
    executeResult,
    syncResult,
    audit,
    gerarPreview,
    executarUpsert,
    sincronizarVendedoresOmie,
    clear,
  } = useOmieUpsertOs()

  const running = loadingPreview || loadingExecute
  const canRun = useMemo(
    () => UUID_REGEX.test(compraId.trim()) && adminPassword.trim().length > 0,
    [compraId, adminPassword]
  )

  const validate = () => {
    if (!UUID_REGEX.test(compraId.trim())) {
      setValidationError('Informe um compra_id valido (UUID).')
      return false
    }
    if (!adminPassword.trim()) {
      setValidationError('Informe a senha administrativa.')
      return false
    }
    setValidationError(null)
    return true
  }

  const onPreview = async () => {
    if (!validate()) return
    await gerarPreview(compraId, adminPassword)
  }

  const onExecute = async () => {
    if (!validate()) return
    await executarUpsert(compraId, adminPassword)
  }

  const onSyncVendedores = async () => {
    await sincronizarVendedoresOmie()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">OMIE Upsert OS</h2>
        <p className="text-muted-foreground">
          Gere preview canônico da OS e execute upsert manual por compra.
        </p>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Entrada e autenticacao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">compra_id</label>
              <Input
                className="font-mono text-xs"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={compraId}
                onChange={(e) => setCompraId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Senha admin</label>
              <PasswordInput
                placeholder="Digite a senha"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onSyncVendedores} disabled={loadingSync || running}>
              {loadingSync ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loadingSync ? 'Sincronizando vendedores...' : 'Sync vendedores OMIE'}
            </Button>
            <Button onClick={onPreview} disabled={!canRun || running}>
              {loadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
              {loadingPreview ? 'Gerando preview...' : 'Gerar preview'}
            </Button>
            <Button variant="secondary" onClick={onExecute} disabled={!canRun || running}>
              {loadingExecute ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {loadingExecute ? 'Executando...' : 'Executar upsert'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setValidationError(null)
                clear()
              }}
              disabled={running}
            >
              Limpar resultado
            </Button>
          </div>

          {validationError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {validationError}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {syncResult && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-medium">Sincronizacao de vendedores concluida (push + pull)</p>
              <p>
                push - processados: {syncResult.push.processed} | criados: {syncResult.push.created} |
                atualizados: {syncResult.push.updated} | vinculados: {syncResult.push.linked} | erros:{' '}
                {syncResult.push.errors}
              </p>
              <p>
                pull - inseridos: {syncResult.pull.inserted} | atualizados: {syncResult.pull.updated} |
                inativados: {syncResult.pull.inactivated} | erros: {syncResult.pull.errors}
              </p>
              <p className="text-xs text-emerald-700/90">
                locais: {syncResult.push.total_local} | remotos: {syncResult.pull.total_remote} |
                paginas: {syncResult.pull.pages} | tempo total: {syncResult.elapsed_ms} ms
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {executeResult && (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Resultado de execucao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong> sucesso
            </p>
            <p>
              <strong>Acao:</strong> {executeResult.action}
            </p>
            <p>
              <strong>OS OMIE:</strong> {executeResult.omie_os_id}
            </p>
            {executeResult.correlation_id && (
              <p className="font-mono text-xs text-muted-foreground">
                correlation_id: {executeResult.correlation_id}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card className="max-w-4xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4" />
                Payload canônico (preview)
              </CardTitle>
              <Badge variant="secondary">{preview.action}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{preview.response_summary}</p>
            {preview.warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Warnings</p>
                <ul className="list-disc pl-4">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {JSON.stringify(preview.payload_canonico, null, 2)}
            </pre>
            <p className="font-mono text-xs text-muted-foreground">
              correlation_id: {preview.correlation_id}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base">Auditoria da ultima tentativa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loadingAudit && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando auditoria...
            </div>
          )}
          {!loadingAudit && !audit && (
            <p className="text-muted-foreground">
              Nenhuma tentativa auditada encontrada para o compra_id informado.
            </p>
          )}
          {audit && (
            <>
              <p>
                <strong>Evento:</strong> {audit.acao}
              </p>
              <p>
                <strong>Horario:</strong> {new Date(audit.created_at).toLocaleString('pt-BR')}
              </p>
              <p>
                <strong>Resultado:</strong> {audit.erro ? 'error' : 'success'}
              </p>
              {audit.erro_mensagem && (
                <p>
                  <strong>Mensagem:</strong> {audit.erro_mensagem}
                </p>
              )}
            </>
          )}
          {technicalError && (
            <details className="rounded-md border bg-muted/40 p-3">
              <summary className="cursor-pointer text-sm font-medium">Detalhes tecnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs">{technicalError}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
