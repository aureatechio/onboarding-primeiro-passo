import { Link } from 'react-router'
import { COLORS } from '../../theme/colors'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'

const ETAPA_SHORT_LABELS = {
  etapa1: { num: '1', name: 'Boas-vindas' },
  etapa2: { num: '2', name: 'Como funciona' },
  etapa3: { num: '3', name: 'Prazos' },
  etapa4: { num: '4', name: 'Regras' },
  etapa5: { num: '5', name: 'Digital' },
  etapa6: { num: '6', name: 'Identidade' },
  etapa62: { num: '6.2', name: 'Bonificação' },
  etapaFinal: { num: '★', name: 'Final' },
}

export default function EtapaSidebar({ etapas, activeEtapaId, dirtyEtapas }) {
  return (
    <nav
      style={{
        width: 200,
        minWidth: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '0 8px 24px 0',
        borderRight: `1px solid ${monitorTheme.border}`,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 120px)',
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: monitorTheme.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase',
          padding: '0 8px 8px',
          margin: 0,
        }}
      >
        Etapas
      </p>

      {etapas.map(({ id }) => {
        const isActive = id === activeEtapaId
        const isDirty = dirtyEtapas.has(id)
        const meta = ETAPA_SHORT_LABELS[id] || { num: '?', name: id }

        return (
          <Link
            key={id}
            to={`/copy-editor?etapa=${encodeURIComponent(id)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: monitorRadius.md,
              border: isActive
                ? `1px solid ${monitorTheme.sidebarItemActiveBorder}`
                : '1px solid transparent',
              background: isActive ? monitorTheme.sidebarItemActiveBg : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              textDecoration: 'none',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = monitorTheme.cardMutedBg
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: isActive ? `${COLORS.red}20` : monitorTheme.cardMutedBg,
                color: isActive ? COLORS.red : monitorTheme.textSecondary,
                fontSize: 11,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {meta.num}
            </span>

            <span
              style={{
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? monitorTheme.textPrimary : monitorTheme.textSecondary,
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.name}
            </span>

            {isDirty && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: COLORS.accent,
                  flexShrink: 0,
                }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
