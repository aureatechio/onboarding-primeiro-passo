import { TYPE, designTokens } from '../../../theme/design-tokens'
import { monitorRadius, monitorTheme } from '../theme'

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div
      style={{
        border: `1px solid ${monitorTheme.border}`,
        background: monitorTheme.cardMutedBg,
        borderRadius: monitorRadius.xl,
        padding: 4,
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        marginBottom: designTokens.space[8],
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              border: `1px solid ${isActive ? monitorTheme.brand : 'transparent'}`,
              background: isActive ? monitorTheme.pageBg : 'transparent',
              color: isActive ? monitorTheme.textPrimary : monitorTheme.textMuted,
              borderRadius: monitorRadius.md,
              padding: '8px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              ...TYPE.caption,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
