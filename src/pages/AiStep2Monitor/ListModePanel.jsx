import { TYPE, designTokens } from '../../theme/design-tokens'
import { STATUS_OPTIONS } from './constants'
import StatusBadge from './components/StatusBadge'
import ProgressBar from './components/ProgressBar'
import { formatDate, uniqueNonEmpty } from './utils'
import { monitorRadius, monitorTheme } from './theme'

export default function ListModePanel({
  listSummary,
  listItems,
  pagination,
  listStatus,
  listCelebrity,
  listCompra,
  eligiblePurchases,
  openJobDetail,
  updateListFilters,
}) {
  const celebrityOptions = uniqueNonEmpty(listItems.map((item) => item.celebrity_name))
  const compraOptions = eligiblePurchases.map((purchase) => ({
    value: purchase.compra_id,
    label: purchase.label,
  }))
  const filteredItems = listCelebrity
    ? listItems.filter((item) => item.celebrity_name === listCelebrity)
    : listItems

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: designTokens.space[5],
          marginBottom: designTokens.space[7],
        }}
      >
        {[
          { label: 'Total', value: listSummary.total ?? 0 },
          { label: 'Processando', value: listSummary.processing ?? 0 },
          { label: 'Concluidos', value: listSummary.completed ?? 0 },
          {
            label: 'Falhas/Parcial',
            value: (listSummary.failed || 0) + (listSummary.partial || 0),
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: `1px solid ${monitorTheme.border}`,
              borderRadius: monitorRadius.xl,
              padding: designTokens.space[6],
            }}
          >
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>{item.label}</p>
            <p style={{ ...TYPE.h3, color: monitorTheme.textPrimary, marginTop: 8 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          border: `1px solid ${monitorTheme.border}`,
          borderRadius: monitorRadius.xl,
          padding: designTokens.space[6],
          marginBottom: designTokens.space[6],
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,2fr) minmax(170px,auto) minmax(180px,1fr) minmax(200px,1fr) 120px',
          gap: designTokens.space[4],
        }}
      >
        <select
          value={listCompra}
          onChange={(event) => updateListFilters({ compra: event.target.value, page: 1 })}
          style={selectStyles}
        >
          <option value="">Compra elegivel (Cliente - Celebridade)</option>
          {compraOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={listStatus}
          onChange={(event) => updateListFilters({ status: event.target.value, page: 1 })}
          style={selectStyles}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={listCelebrity}
          onChange={(event) => updateListFilters({ celebrity: event.target.value, page: 1 })}
          style={selectStyles}
        >
          <option value="">Todas celebridades</option>
          {celebrityOptions.map((celebrityName) => (
            <option key={celebrityName} value={celebrityName}>
              {celebrityName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!listCompra) return
            window.open(buildOnboardingFormUrl(listCompra), '_blank', 'noopener,noreferrer')
          }}
          disabled={!listCompra}
          style={{
            ...highlightActionButtonStyles,
            opacity: listCompra ? 1 : 0.65,
            cursor: listCompra ? 'pointer' : 'not-allowed',
          }}
        >
          Abrir formulario
        </button>
        <button
          type="button"
          onClick={() => updateListFilters({ compra: '', status: '', celebrity: '', page: 1 })}
          style={actionButtonStyles}
        >
          Limpar
        </button>
      </div>

      <section style={{ border: `1px solid ${monitorTheme.border}`, borderRadius: monitorRadius.xl, overflow: 'hidden', width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            background: monitorTheme.cardMutedBg,
            padding: '10px 16px',
            borderBottom: `1px solid ${monitorTheme.border}`,
            gap: 12,
          }}
        >
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Cliente</p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Celebridade</p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Status</p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Perplexity</p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Progresso</p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Atualizado em</p>
        </div>
        {filteredItems.length === 0 ? (
          <div style={{ padding: 16, color: monitorTheme.textMuted }}>Nenhum job encontrado.</div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.job_id}
              type="button"
              onClick={() => openJobDetail(item.job_id)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                padding: '12px 16px',
                width: '100%',
                border: 'none',
                borderBottom: `1px solid ${monitorTheme.borderSoft}`,
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                background: monitorTheme.pageBg,
                transition: designTokens.motion.transitionFast,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = monitorTheme.cardMutedBg
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = monitorTheme.pageBg
              }}
            >
              <p style={{ ...TYPE.bodySmall, color: monitorTheme.textPrimary, margin: 0, ...truncateStyles }}>
                {item.client_name || '-'}
              </p>
              <p style={{ ...TYPE.bodySmall, color: monitorTheme.textSecondary, margin: 0, ...truncateStyles }}>
                {item.celebrity_name || '-'}
              </p>
              <StatusBadge status={item.status} />
              <span style={item.has_perplexity_briefing ? perplexityOnBadgeStyle : perplexityOffBadgeStyle}>
                {item.has_perplexity_briefing ? 'Perplexity' : 'Sem Perplexity'}
              </span>
              <ProgressBar percent={item.percent} height={7} />
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, margin: 0, ...truncateStyles }}>
                {formatDate(item.updated_at)}
              </p>
            </button>
          ))
        )}
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: designTokens.space[6] }}>
        <button
          type="button"
          disabled={(pagination.page || 1) <= 1}
          onClick={() => updateListFilters({ page: Math.max(1, (pagination.page || 1) - 1) })}
          style={{
            ...actionButtonStyles,
            opacity: (pagination.page || 1) <= 1 ? 0.5 : 1,
          }}
        >
          Anterior
        </button>
        <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
          Pagina {pagination.page || 1} de {pagination.total_pages || 1}
        </p>
        <button
          type="button"
          disabled={(pagination.page || 1) >= (pagination.total_pages || 1)}
          onClick={() => updateListFilters({ page: (pagination.page || 1) + 1 })}
          style={{
            ...actionButtonStyles,
            opacity: (pagination.page || 1) >= (pagination.total_pages || 1) ? 0.5 : 1,
          }}
        >
          Proxima
        </button>
      </div>
    </>
  )
}

const truncateStyles = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const selectStyles = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  borderRadius: monitorRadius.sm,
  padding: '8px 10px',
  fontSize: 13,
  color: monitorTheme.textPrimary,
  background: monitorTheme.pageBg,
}

const actionButtonStyles = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: monitorTheme.pageBg,
  borderRadius: monitorRadius.sm,
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 600,
  color: monitorTheme.textPrimary,
}

const highlightActionButtonStyles = {
  border: 'none',
  background: `linear-gradient(135deg, ${monitorTheme.brandGradientStart}, ${monitorTheme.brandGradientEnd})`,
  color: '#FFFFFF',
  borderRadius: monitorRadius.sm,
  padding: '8px 12px',
  fontWeight: 700,
}

function buildOnboardingFormUrl(compraId) {
  const url = new URL('/', window.location.origin)
  url.searchParams.set('compra_id', compraId)
  return url.toString()
}

const perplexityBadgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  width: 'fit-content',
}

const perplexityOnBadgeStyle = {
  ...perplexityBadgeBaseStyle,
  background: monitorTheme.completedBg,
  color: monitorTheme.completedText,
}

const perplexityOffBadgeStyle = {
  ...perplexityBadgeBaseStyle,
  background: monitorTheme.pendingBg,
  color: monitorTheme.pendingText,
}
