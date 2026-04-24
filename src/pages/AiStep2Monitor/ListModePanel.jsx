import { useState, useRef, useEffect, useMemo } from 'react'
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
  availablePurchases,
  releaseOnboarding,
  openJobDetail,
  updateListFilters,
  canMutate = false,
}) {
  const [releasing, setReleasing] = useState(false)
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)
  const [releaseNotes, setReleaseNotes] = useState('')
  const [releaseReason, setReleaseReason] = useState('negotiated_payment_terms')

  const [compraSearch, setCompraSearch] = useState('')
  const [compraIdSearch, setCompraIdSearch] = useState('')
  const [showCompraDropdown, setShowCompraDropdown] = useState(false)
  const compraInputRef = useRef(null)
  const compraDropdownRef = useRef(null)

  const celebrityOptions = uniqueNonEmpty(listItems.map((item) => item.celebrity_name))
  const compraOptions = (availablePurchases || []).map((purchase) => ({
    value: purchase.compra_id,
    label: purchase.eligible
      ? `✅ ${purchase.label}`
      : `🔒 ${purchase.label}`,
    rawLabel: purchase.label,
    eligible: purchase.eligible,
    eligibilityReason: purchase.eligibility_reason,
    onboardingAccessStatus: purchase.onboarding_access_status,
  }))

  const filteredCompraOptions = useMemo(() => {
    if (!compraSearch.trim()) return compraOptions
    const term = compraSearch.toLowerCase()
    return compraOptions.filter((o) => o.rawLabel.toLowerCase().includes(term))
  }, [compraSearch, compraOptions])

  const selectedCompraLabel = listCompra
    ? compraOptions.find((o) => o.value === listCompra)?.label || listCompra
    : ''

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        compraDropdownRef.current &&
        !compraDropdownRef.current.contains(e.target) &&
        compraInputRef.current &&
        !compraInputRef.current.contains(e.target)
      ) {
        setShowCompraDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCompra(value) {
    updateListFilters({ compra: value, page: 1 })
    setShowReleaseConfirm(false)
    setCompraSearch('')
    setShowCompraDropdown(false)
  }

  function handleCompraIdGo() {
    const id = compraIdSearch.trim()
    if (!id) return
    updateListFilters({ compra: id, page: 1 })
    setShowReleaseConfirm(false)
    setCompraIdSearch('')
    setCompraSearch('')
    setShowCompraDropdown(false)
  }

  const selectedPurchase = (availablePurchases || []).find(
    (p) => p.compra_id === listCompra,
  )
  const isSelectedEligible = selectedPurchase?.eligible ?? false
  const isSelectedBlocked = listCompra && !isSelectedEligible
  const canOpenForm = listCompra && isSelectedEligible

  const filteredItems = listCelebrity
    ? listItems.filter((item) => item.celebrity_name === listCelebrity)
    : listItems

  async function handleRelease() {
    if (!listCompra || releasing) return
    setReleasing(true)
    await releaseOnboarding(listCompra, releaseReason, releaseNotes)
    setReleasing(false)
    setShowReleaseConfirm(false)
    setReleaseNotes('')
  }

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
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.space[4],
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)',
            gap: designTokens.space[4],
            alignItems: 'start',
          }}
        >
          {/* Autocomplete de vendas */}
          <div style={{ position: 'relative' }}>
            <label style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'block', marginBottom: 4 }}>
              Buscar venda por nome
            </label>
            <input
              ref={compraInputRef}
              type="text"
              value={showCompraDropdown ? compraSearch : selectedCompraLabel}
              placeholder="Digite o nome do cliente..."
              onFocus={() => {
                setShowCompraDropdown(true)
                setCompraSearch('')
              }}
              onChange={(e) => setCompraSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowCompraDropdown(false)
                  compraInputRef.current?.blur()
                }
                if (e.key === 'Enter' && filteredCompraOptions.length === 1) {
                  selectCompra(filteredCompraOptions[0].value)
                }
              }}
              style={{
                ...selectStyles,
                width: '100%',
                boxSizing: 'border-box',
              }}
              autoComplete="off"
            />
            {showCompraDropdown && (
              <div
                ref={compraDropdownRef}
                style={compraDropdownStyles}
              >
                <button
                  type="button"
                  onClick={() => selectCompra('')}
                  style={{
                    ...compraOptionStyles,
                    fontWeight: !listCompra ? 700 : 400,
                    background: !listCompra ? monitorTheme.cardMutedBg : 'transparent',
                  }}
                >
                  Todas as vendas (contrato assinado)
                </button>
                {filteredCompraOptions.length === 0 ? (
                  <div style={{ ...TYPE.caption, color: monitorTheme.textMuted, padding: '10px 12px' }}>
                    Nenhuma venda encontrada
                  </div>
                ) : (
                  filteredCompraOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectCompra(option.value)}
                      style={{
                        ...compraOptionStyles,
                        fontWeight: option.value === listCompra ? 700 : 400,
                        background: option.value === listCompra ? monitorTheme.cardMutedBg : 'transparent',
                      }}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Busca por compra_id */}
          <div>
            <label style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'block', marginBottom: 4 }}>
              Buscar por compra_id
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={compraIdSearch}
                placeholder="Cole o UUID da compra..."
                onChange={(e) => setCompraIdSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCompraIdGo()
                }}
                style={{
                  ...selectStyles,
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontFamily: designTokens.fontFamily.mono,
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                onClick={handleCompraIdGo}
                disabled={!compraIdSearch.trim()}
                style={{
                  ...actionButtonStyles,
                  opacity: compraIdSearch.trim() ? 1 : 0.5,
                  cursor: compraIdSearch.trim() ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                Ir
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(170px,auto) minmax(180px,1fr) minmax(200px,1fr) 120px',
            gap: designTokens.space[4],
            alignItems: 'center',
          }}
        >
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
          {canMutate && isSelectedBlocked ? (
            <button
              type="button"
              onClick={() => setShowReleaseConfirm(true)}
              disabled={releasing}
              style={{
                ...releaseButtonStyles,
                opacity: releasing ? 0.65 : 1,
                cursor: releasing ? 'wait' : 'pointer',
              }}
            >
              {releasing ? 'Liberando...' : 'Liberar Onboarding'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canOpenForm) return
                window.open(buildOnboardingFormUrl(listCompra), '_blank', 'noopener,noreferrer')
              }}
              disabled={!canOpenForm}
              style={{
                ...highlightActionButtonStyles,
                opacity: canOpenForm ? 1 : 0.65,
                cursor: canOpenForm ? 'pointer' : 'not-allowed',
              }}
            >
              Abrir formulario
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              updateListFilters({ compra: '', status: '', celebrity: '', page: 1 })
              setShowReleaseConfirm(false)
              setCompraSearch('')
              setCompraIdSearch('')
            }}
            style={actionButtonStyles}
          >
            Limpar
          </button>
        </div>
      </div>

      {selectedPurchase && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: designTokens.space[5],
            padding: '8px 14px',
            borderRadius: monitorRadius.md,
            background: isSelectedEligible ? monitorTheme.completedBg : monitorTheme.pendingBg,
            border: `1px solid ${isSelectedEligible ? monitorTheme.completedText : monitorTheme.pendingText}30`,
          }}
        >
          <span style={{
            ...TYPE.bodySmall,
            fontWeight: 700,
            color: isSelectedEligible ? monitorTheme.completedText : monitorTheme.pendingText,
          }}>
            {isSelectedEligible ? 'Elegivel' : 'Bloqueada'}
          </span>
          {!isSelectedEligible && selectedPurchase.eligibility_reason && (
            <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
              — {eligibilityReasonLabel(selectedPurchase.eligibility_reason)}
            </span>
          )}
          {selectedPurchase.onboarding_access_status === 'allowed' && (
            <span style={{
              ...eligibilityBadgeStyle,
              background: monitorTheme.completedBg,
              color: monitorTheme.completedText,
            }}>
              Liberado manualmente
            </span>
          )}
          <span style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginLeft: 'auto' }}>
            checkout: {selectedPurchase.checkout_status || '?'} | contrato: {selectedPurchase.clicksign_status || '?'}
          </span>
        </div>
      )}

      {canMutate && showReleaseConfirm && isSelectedBlocked && (
        <div
          style={{
            border: `1px solid ${monitorTheme.borderStrong}`,
            borderRadius: monitorRadius.xl,
            padding: designTokens.space[6],
            marginBottom: designTokens.space[6],
            background: monitorTheme.cardMutedBg,
          }}
        >
          <p style={{ ...TYPE.bodySmall, fontWeight: 700, color: monitorTheme.textPrimary, marginBottom: 10 }}>
            Confirmar liberacao de onboarding
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'block', marginBottom: 4 }}>
                Motivo
              </label>
              <select
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                style={selectStyles}
              >
                <option value="negotiated_payment_terms">Pagamento negociado</option>
                <option value="manual_exception">Excecao manual</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'block', marginBottom: 4 }}>
                Observacao (opcional)
              </label>
              <input
                type="text"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Ex: Aprovado pelo comercial em 10/04"
                maxLength={500}
                style={{ ...selectStyles, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleRelease}
              disabled={releasing}
              style={{
                ...releaseButtonStyles,
                opacity: releasing ? 0.65 : 1,
              }}
            >
              {releasing ? 'Liberando...' : 'Confirmar liberacao'}
            </button>
            <button
              type="button"
              onClick={() => setShowReleaseConfirm(false)}
              style={actionButtonStyles}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <section style={{ border: `1px solid ${monitorTheme.border}`, borderRadius: monitorRadius.xl, overflow: 'hidden', width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
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
          <p style={{ ...TYPE.caption, color: monitorTheme.textSecondary, margin: 0 }}>Diagnostico</p>
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
                gridTemplateColumns: 'repeat(7, 1fr)',
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
              <span
                style={getDiagnosticBadgeStyle(item)}
                title={getDiagnosticTooltip(item)}
              >
                {getDiagnosticLabel(item)}
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

const releaseButtonStyles = {
  border: 'none',
  background: '#f59e0b',
  color: '#1a1a1a',
  borderRadius: monitorRadius.sm,
  padding: '8px 12px',
  fontWeight: 700,
  cursor: 'pointer',
}

const eligibilityBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
}

function eligibilityReasonLabel(reason) {
  const map = {
    compra_nao_paga: 'Pagamento pendente',
    contrato_nao_assinado: 'Contrato nao assinado',
    db_error: 'Erro interno',
    compra_not_found: 'Compra nao encontrada',
  }
  return map[reason] || reason
}

const compraDropdownStyles = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  maxHeight: 280,
  overflowY: 'auto',
  overflowX: 'hidden',
  background: monitorTheme.pageBg,
  border: `1px solid ${monitorTheme.borderStrong}`,
  borderRadius: monitorRadius.sm,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
}

const compraOptionStyles = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  flexShrink: 0,
  border: 'none',
  padding: '8px 12px',
  fontSize: 13,
  color: monitorTheme.textPrimary,
  textAlign: 'left',
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background 0.1s',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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

const diagnosticBadgeBaseStyle = {
  ...perplexityBadgeBaseStyle,
  border: `1px solid ${monitorTheme.borderStrong}`,
}

function getDiagnosticLabel(item) {
  if (item?.stuck_assets_count > 0) return `Preso (${item.stuck_assets_count})`
  if (item?.has_inconsistency) return 'Inconsistente'
  if (item?.last_error_type) return item.last_error_type
  if (item?.failed_assets_count > 0) return `Falhas (${item.failed_assets_count})`
  return 'Sem sinais'
}

function getDiagnosticTooltip(item) {
  const flags = Array.isArray(item?.inconsistency_flags) ? item.inconsistency_flags.join(', ') : 'none'
  const lastError = item?.last_error_type || 'n/a'
  return `flags=${flags} | failed_assets=${item?.failed_assets_count || 0} | stuck_assets=${item?.stuck_assets_count || 0} | last_error=${lastError}`
}

function getDiagnosticBadgeStyle(item) {
  if (item?.stuck_assets_count > 0 || item?.has_inconsistency) {
    return {
      ...diagnosticBadgeBaseStyle,
      background: monitorTheme.dangerBg,
      borderColor: monitorTheme.dangerBorder,
      color: monitorTheme.dangerTextStrong,
    }
  }

  if (item?.failed_assets_count > 0 || item?.last_error_type) {
    return {
      ...diagnosticBadgeBaseStyle,
      background: monitorTheme.pendingBg,
      color: monitorTheme.pendingText,
    }
  }

  return {
    ...diagnosticBadgeBaseStyle,
    background: monitorTheme.completedBg,
    color: monitorTheme.completedText,
  }
}
