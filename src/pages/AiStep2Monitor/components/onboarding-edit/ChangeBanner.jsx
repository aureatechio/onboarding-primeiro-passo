import { monitorTheme } from '../../theme'

const ACELERAI_BLUE = monitorTheme.actionPrimaryBg
const SANS = "'Inter', system-ui, sans-serif"

const KEY_PREFIX = 'onb23_regen_banner:'

export function readBannerState(compraId) {
  if (!compraId || typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + compraId) === '1'
  } catch {
    return false
  }
}

export function setBannerState(compraId, active) {
  if (!compraId || typeof window === 'undefined') return
  try {
    if (active) window.sessionStorage.setItem(KEY_PREFIX + compraId, '1')
    else window.sessionStorage.removeItem(KEY_PREFIX + compraId)
  } catch {
    /* ignore */
  }
}

export default function ChangeBanner({ active, onRegenerate, onDismiss, regenerating }) {
  if (!active) return null
  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: `${ACELERAI_BLUE}1a`,
        border: `1px solid ${ACELERAI_BLUE}`,
        borderRadius: 10,
        color: monitorTheme.textPrimary,
        fontFamily: SANS,
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 13, flex: 1 }}>
        Alterações foram salvas. Os jobs IA atuais podem não refletir os novos dados.
      </span>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        style={{
          background: ACELERAI_BLUE,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: regenerating ? 'wait' : 'pointer',
          fontFamily: SANS,
        }}
      >
        {regenerating ? 'Regenerando…' : 'Regerar jobs'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar"
        style={{
          background: 'transparent',
          color: monitorTheme.textMuted,
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          padding: '4px 8px',
        }}
      >
        ✕
      </button>
    </div>
  )
}
