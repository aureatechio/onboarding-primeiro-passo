import { Brain, Palette, BarChart3 } from 'lucide-react'
import TopBarLogo from '../../components/TopBarLogo'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'

const NAV_ITEMS = [
  { id: 'monitor', label: 'Visao Geral', icon: BarChart3, path: '/ai-step2/monitor?mode=list' },
  { id: 'perplexity', label: 'Perplexity IA', icon: Brain, path: '/ai-step2/perplexity-config' },
  { id: 'nanobanana', label: 'NanoBanana IA', icon: Palette, path: '/ai-step2/nanobanana-config' },
]

function getActiveId() {
  const pathname = window.location.pathname || '/'
  if (pathname.includes('perplexity-config')) return 'perplexity'
  if (pathname.includes('nanobanana-config')) return 'nanobanana'
  return 'monitor'
}

function navigateTo(path) {
  const target = new URL(path, window.location.origin)
  const next = `${target.pathname}${target.search}`
  const current = `${window.location.pathname}${window.location.search}`
  if (next === current) return

  if (typeof performance !== 'undefined') {
    performance.mark('ai-step2-nav-start')
  }

  window.history.pushState({}, '', next)
  window.dispatchEvent(new Event('aurea:location-change'))
}

export default function MonitorLayout({ children }) {
  const activeId = getActiveId()

  return (
    <div style={{ minHeight: '100vh', background: monitorTheme.layoutBg, color: monitorTheme.textPrimary }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', minHeight: '100vh' }}>
        <aside
          style={{
            background: monitorTheme.sidebarBg,
            borderRight: `1px solid ${monitorTheme.sidebarBorder}`,
            padding: designTokens.space[9],
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.space[8],
          }}
        >
          <button
            type="button"
            onClick={() => navigateTo('/ai-step2/monitor?mode=list')}
            style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
            aria-label="Ir para home do monitor"
          >
            <TopBarLogo height={24} maxWidth={156} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeId
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.path)}
                  style={{
                    borderRadius: monitorRadius.md,
                    padding: '10px 12px',
                    background: isActive ? monitorTheme.sidebarItemActiveBg : 'transparent',
                    border: isActive
                      ? `1px solid ${monitorTheme.sidebarItemActiveBorder}`
                      : '1px solid transparent',
                    color: monitorTheme.sidebarText,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = monitorTheme.sidebarItemBg
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Icon size={15} style={{ opacity: isActive ? 1 : 0.6 }} />
                  {item.label}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 'auto', borderTop: `1px solid ${monitorTheme.sidebarBorder}`, paddingTop: 12 }}>
            <p style={{ ...TYPE.caption, color: monitorTheme.sidebarTextMuted }}>Painel IA</p>
            <p style={{ ...TYPE.bodySmall, color: monitorTheme.sidebarText }}>Configuracoes de IA</p>
          </div>
        </aside>

        <main style={{ background: monitorTheme.pageBg, padding: designTokens.space[11] }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
