import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const STATUS_ENTRIES = [
  {
    status: 'pending',
    label: 'Pendente',
    color: 'bg-amber-400',
    desc: 'Sessão criada, aguardando ação de pagamento do cliente.',
  },
  {
    status: 'processing',
    label: 'Em processamento',
    color: 'bg-blue-500',
    desc: 'Pagamento enviado ao gateway, aguardando confirmação.',
  },
  {
    status: 'completed',
    label: 'Pago',
    color: 'bg-emerald-500',
    desc: 'Pagamento confirmado com sucesso.',
  },
  {
    status: 'failed',
    label: 'Falhou',
    color: 'bg-red-500',
    desc: 'Pagamento recusado ou erro no processamento.',
  },
  {
    status: 'expired',
    label: 'Expirado',
    color: 'bg-slate-400',
    desc: 'Sessão expirou sem conclusão (timeout).',
  },
  {
    status: 'cancelled',
    label: 'Cancelado',
    color: 'bg-gray-500',
    desc: 'Sessão cancelada manualmente ou por regra de negócio.',
  },
  {
    status: 'split_created',
    label: 'Split criado',
    color: 'bg-purple-500',
    desc: 'Sessão gerou sub-sessões de pagamento dividido (2 meios).',
  },
]

const SLA_ENTRIES = [
  {
    bucket: 'OK',
    threshold: '< 15 min',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Dentro do esperado.',
  },
  {
    bucket: 'Atenção',
    threshold: '15–30 min',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Atraso moderado — acompanhar.',
  },
  {
    bucket: 'Crítico',
    threshold: '> 30 min',
    badge: 'bg-red-50 text-red-700 border-red-200',
    desc: 'Atraso grave — requer ação imediata.',
  },
]

const DIVERGENCE_ENTRIES = [
  {
    type: 'Sessão paga, compra não',
    desc: 'O gateway confirmou o pagamento, mas a compra no sistema ainda não foi atualizada. Pode indicar falha no webhook.',
  },
  {
    type: 'Compra paga, sessão pendente',
    desc: 'A compra foi marcada como paga, mas a sessão de pagamento não concluiu. Pode indicar atualização manual ou duplicidade.',
  },
]

const ALERT_ENTRIES = [
  { label: 'Taxa de erro alta', severity: 'Crítico', desc: 'Mais de X% das sessões falharam em curto período.' },
  { label: 'Função 100% falha', severity: 'Crítico', desc: 'Uma Edge Function falhou em todas as execuções recentes.' },
  { label: 'SLA crítico', severity: 'Crítico', desc: 'Sessões ultrapassaram 30 minutos sem conclusão.' },
  { label: 'Spike HTTP 401/5xx', severity: 'Crítico', desc: 'Pico de erros de autenticação ou servidor no gateway.' },
  { label: 'SLA atenção', severity: 'Atenção', desc: 'Sessões ultrapassaram 15 minutos sem conclusão.' },
  { label: 'Queda de webhooks', severity: 'Atenção', desc: 'Volume de webhooks caiu significativamente.' },
  { label: 'Spike erros boleto', severity: 'Atenção', desc: 'Aumento de erros na geração de boleto parcelado.' },
  { label: 'Spike reconciliação', severity: 'Atenção', desc: 'Volume anormal de reconciliações automáticas.' },
  { label: 'Janela reconciliação ausente', severity: 'Atenção', desc: 'Reconciliação automática não executou no horário esperado.' },
  { label: 'Reconciliação manual', severity: 'Info', desc: 'Um operador disparou reconciliação manual.' },
  { label: 'Reconciliação automática', severity: 'Info', desc: 'Ciclo de reconciliação automática executado.' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h3>
  )
}

export function GlossaryDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />
          Glossário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Glossário do Checkout Monitor</DialogTitle>
          <DialogDescription>
            Referência rápida de todos os termos, status e métricas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <SectionTitle>Status do checkout</SectionTitle>
          <div className="space-y-2">
            {STATUS_ENTRIES.map((s) => (
              <div key={s.status} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${s.color}`}
                />
                <div>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground"> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle>SLA (Service Level Agreement)</SectionTitle>
          <div className="space-y-2">
            {SLA_ENTRIES.map((s) => (
              <div key={s.bucket} className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${s.badge}`}
                >
                  {s.bucket}
                </Badge>
                <div>
                  <span className="font-medium">{s.threshold}</span>
                  <span className="text-muted-foreground"> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle>Divergências</SectionTitle>
          <div className="space-y-2">
            {DIVERGENCE_ENTRIES.map((d) => (
              <div key={d.type}>
                <span className="font-medium">{d.type}</span>
                <span className="text-muted-foreground"> — {d.desc}</span>
              </div>
            ))}
          </div>

          <SectionTitle>Tipos de alerta</SectionTitle>
          <div className="space-y-2">
            {ALERT_ENTRIES.map((a) => (
              <div key={a.label} className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${
                    a.severity === 'Crítico'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : a.severity === 'Atenção'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {a.severity}
                </Badge>
                <div>
                  <span className="font-medium">{a.label}</span>
                  <span className="text-muted-foreground"> — {a.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle>Ações disponíveis</SectionTitle>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Reconciliar</span>{' '}
              — Força consulta de status do pagamento no gateway. Requer senha
              admin e tem cooldown de 30s por sessão.
            </p>
            <p>
              <span className="font-medium text-foreground">Ver transação</span>{' '}
              — Abre a página de detalhes da compra para investigação.
            </p>
            <p>
              <span className="font-medium text-foreground">Atualizar</span>{' '}
              — Recarrega todos os dados manualmente (além do polling automático
              de 60s).
            </p>
          </div>

          <SectionTitle>Gráficos</SectionTitle>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                Distribuição de status
              </span>{' '}
              — Donut com proporção de cada status nas últimas 24h. Ideal: fatia
              &quot;Pago&quot; dominante.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Webhook signal
              </span>{' '}
              — Barras com volume de webhooks por hora. Queda súbita indica
              possível falha na integração.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
