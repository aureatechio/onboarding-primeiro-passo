import { useEffect, useRef, useState } from 'react'
import { Brain, Palette, BarChart3, Sparkles, Image, FileText, LogOut } from 'lucide-react'
import TopBarLogo from '../../components/TopBarLogo'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'
import { useAuth } from '../../context/AuthContext'

const MAIN_NAV = [
  { id: 'monitor', label: 'Visao Geral', icon: BarChart3, path: '/ai-step2/monitor?mode=list' },
  { id: 'perplexity', label: 'Perplexity IA', icon: Brain, path: '/ai-step2/perplexity-config' },
  { id: 'nanobanana', label: 'NanoBanana IA', icon: Palette, path: '/ai-step2/nanobanana-config' },
  { id: 'copy-editor', label: 'Copy Editor', icon: FileText, path: '/copy-editor' },
]

const GARDEN_NAV = [
  { id: 'post-gen', label: 'Post Gen', icon: Sparkles, path: '/ai-step2/post-gen', newTab: true },
  { id: 'gallery', label: 'Galeria', icon: Image, path: '/ai-step2/gallery', newTab: true },
]

function getActiveId() {
  const pathname = window.location.pathname || '/'
  if (pathname.includes('perplexity-config')) return 'perplexity'
  if (pathname.includes('nanobanana-config')) return 'nanobanana'
  if (pathname.includes('post-gen')) return 'post-gen'
  if (pathname.includes('gallery')) return 'gallery'
  if (pathname.startsWith('/copy-editor')) return 'copy-editor'
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

function handleNavClick(item) {
  if (item.newTab) {
    window.open(item.path, '_blank')
  } else {
    navigateTo(item.path)
  }
}

function NavButton({ item, isActive }) {
  const Icon = item.icon
  return (
    <button
      key={item.id}
      type="button"
      onClick={() => handleNavClick(item)}
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
}

function SessionBanner() {
  const { isAuthenticated, isAuthLoading } = useAuth()
  const wasAuthRef = useRef(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthRef.current = true
      if (expired) setExpired(false)
      return
    }
    if (!isAuthLoading && wasAuthRef.current) {
      setExpired(true)
    }
  }, [isAuthenticated, isAuthLoading, expired])

  if (!expired) return null

  return (
    <div
      role="alert"
      style={{
        background: monitorTheme.dangerBg,
        border: `1px solid ${monitorTheme.dangerBorder}`,
        color: monitorTheme.dangerTextStrong,
        borderRadius: monitorRadius.md,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>Sua sessao expirou. Faca login novamente para continuar.</span>
      <button
        type="button"
        onClick={() => navigateTo('/login')}
        style={{
          background: 'transparent',
          border: `1px solid ${monitorTheme.dangerBorder}`,
          color: monitorTheme.dangerTextStrong,
          padding: '6px 10px',
          borderRadius: monitorRadius.sm,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Ir para login
      </button>
    </div>
  )
}

function SidebarFooter() {
  const { user, signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    window.history.replaceState({}, '', '/login')
    window.dispatchEvent(new Event('aurea:location-change'))
  }

  return (
    <div
      style={{
        marginTop: 'auto',
        borderTop: `1px solid ${monitorTheme.sidebarBorder}`,
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {user?.email && (
        <p
          style={{
            ...TYPE.caption,
            color: monitorTheme.sidebarTextMuted,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={user.email}
        >
          {user.email}
        </p>
      )}
      <button
        type="button"
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'transparent',
          border: `1px solid ${monitorTheme.sidebarItemBorder}`,
          borderRadius: monitorRadius.md,
          color: monitorTheme.sidebarText,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = monitorTheme.sidebarItemBg }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <LogOut size={14} />
        Sair
      </button>
    </div>
  )
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
            {MAIN_NAV.map((item) => (
              <NavButton key={item.id} item={item} isActive={item.id === activeId} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{
              ...TYPE.caption,
              color: monitorTheme.sidebarTextMuted,
              padding: '4px 12px 2px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Aurea Garden
            </p>
            {GARDEN_NAV.map((item) => (
              <NavButton key={item.id} item={item} isActive={item.id === activeId} />
            ))}
          </div>

          <SidebarFooter />
        </aside>

        <main style={{ background: monitorTheme.pageBg, padding: designTokens.space[11] }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <SessionBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
