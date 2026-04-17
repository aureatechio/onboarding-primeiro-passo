import { monitorTheme } from '../theme'

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${monitorTheme.border}`,
        marginBottom: 20,
        overflowX: 'auto',
        scrollbarWidth: 'none',
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
              border: 'none',
              borderBottom: `2px solid ${isActive ? monitorTheme.brand : 'transparent'}`,
              background: 'transparent',
              color: isActive ? monitorTheme.textPrimary : monitorTheme.textMuted,
              padding: '9px 16px',
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '0.01em',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = monitorTheme.textSecondary
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = monitorTheme.textMuted
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
