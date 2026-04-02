import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StatusDistributionEntry, WebhookSignalHour } from '@/lib/checkout-monitor'
import {
  getStatusColor,
  getStatusLabel,
  formatHourBucket,
  MONITOR_HELP_TEXTS,
} from '@/lib/checkout-monitor'
import { InfoDialog } from './InfoDialog'

interface StatusDistributionChartProps {
  distribution: StatusDistributionEntry[]
  webhookSignal: WebhookSignalHour[]
}

function DonutLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0)
  const cy = Number(props.cy ?? 0)
  const midAngle = Number(props.midAngle ?? 0)
  const innerRadius = Number(props.innerRadius ?? 0)
  const outerRadius = Number(props.outerRadius ?? 0)
  const percent = Number(props.percent ?? 0)

  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function StatusDistributionChart({
  distribution,
  webhookSignal,
}: StatusDistributionChartProps) {
  const pieData = distribution
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const barData = webhookSignal.map((h) => ({
    ...h,
    hour: formatHourBucket(h.hour_bucket),
  }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-sm">Distribuição de status (24h)</CardTitle>
            <InfoDialog title="Distribuição de status (24h)">
              <p>{MONITOR_HELP_TEXTS.statusDistribution}</p>
            </InfoDialog>
          </div>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem sessões nas últimas 24h
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                  labelLine={false}
                  label={DonutLabel}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={getStatusColor(entry.status)}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    getStatusLabel(String(name)),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {pieData.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {pieData.map((entry) => (
                <div key={entry.status} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getStatusColor(entry.status) }}
                  />
                  <span className="text-muted-foreground">
                    {getStatusLabel(entry.status)} ({entry.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-sm">Webhook signal (24h)</CardTitle>
            <InfoDialog title="Webhook signal (24h)">
              <p>{MONITOR_HELP_TEXTS.webhookSignal}</p>
            </InfoDialog>
          </div>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem dados de webhooks nas últimas 24h
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="incoming_webhooks"
                  name="Webhooks recebidos"
                  fill="var(--color-chart-1)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="incoming_webhooks_ok"
                  name="Webhooks OK"
                  fill="#22c55e"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="pending_with_payment"
                  name="Pendentes com payment_id"
                  fill="var(--color-chart-4)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
