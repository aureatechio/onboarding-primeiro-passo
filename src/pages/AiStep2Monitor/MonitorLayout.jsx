import { useEffect, useRef, useState } from 'react'
import { Brain, Palette, BarChart3, FileText, LogOut, UserCircle, Users } from 'lucide-react'
import TopBarLogo from '../../components/TopBarLogo'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'
import { useAuth } from '../../context/AuthContext'
import { focusVisibleStyle } from '../../theme/dashboard-tokens'

const MAIN_NAV = [
  { id: 'monitor', label: 'Visão Geral', icon: BarChart3, path: '/ai-step2/monitor?mode=list' },
  { id: 'perplexity', label: 'Perplexity IA', icon: Brain, path: '/ai-step2/perplexity-config' },
  { id: 'nanobanana', label: 'NanoBanana IA', icon: Palette, path: '/ai-step2/nanobanana-config' },
  { id: 'copy-editor', label: 'Copy Editor', icon: FileText, path: '/copy-editor' },
]

const USERS_NAV = [
  { id: 'users', label: 'Usuários', icon: Users, path: '/users' },
]

const ACCOUNT_NAV = [
  { id: 'profile', label: 'Meu Perfil', icon: UserCircle, path: '/profile' },
]

function getActiveId() {
  const pathname = window.location.pathname || '/'
  if (pathname.includes('perplexity-config')) return 'perplexity'
  if (pathname.includes('nanobanana-config')) return 'nanobanana'
  if (pathname.startsWith('/copy-editor')) return 'copy-editor'
  if (pathname.startsWith('/users')) return 'users'
  if (pathname.startsWith('/profile')) return 'profile'
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
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <button
      key={item.id}
      type="button"
      onClick={() => handleNavClick(item)}
      aria-current={isActive ? 'page' : undefined}
      style={{
        borderRadius: monitorRadius.md,
        padding: '10px 12px',
        background: isActive ? monitorTheme.sidebarItemActiveBg : hovered ? monitorTheme.sidebarItemBg : 'transparent',
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
        ...(focused ? focusVisibleStyle : null),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
      <span>Sua sessão expirou. Faça login novamente para continuar.</span>
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
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)

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
          ...(focused ? focusVisibleStyle : null),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <LogOut size={14} />
        Sair
      </button>
    </div>
  )
}

function useCompactDashboard() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 1023px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(max-width: 1023px)')
    const sync = () => setCompact(media.matches)
    sync()
    media.addEventListener?.('change', sync)
    return () => media.removeEventListener?.('change', sync)
  }, [])

  return compact
}

function NavSections({ mainNav, isAdmin, compact = false }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 6 }}>
        {mainNav.map((item) => (
          <NavButton key={item.id} item={item} isActive={item.id === getActiveId()} />
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 6 }}>
          {!compact ? (
            <p style={{
              ...TYPE.caption,
              color: monitorTheme.sidebarTextMuted,
              padding: '4px 12px 2px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Acesso
            </p>
          ) : null}
          {USERS_NAV.map((item) => (
            <NavButton key={item.id} item={item} isActive={item.id === getActiveId()} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 6 }}>
        {ACCOUNT_NAV.map((item) => (
          <NavButton key={item.id} item={item} isActive={item.id === getActiveId()} />
        ))}
      </div>
    </>
  )
}

export default function MonitorLayout({ children }) {
  const { isAdmin } = useAuth()
  const compact = useCompactDashboard()
  const mainNav = isAdmin ? MAIN_NAV : MAIN_NAV.filter((item) => item.id === 'monitor')

  if (compact) {
    return (
      <div style={{ minHeight: '100vh', background: monitorTheme.layoutBg, color: monitorTheme.textPrimary }}>
        <header
          style={{
            background: monitorTheme.sidebarBg,
            borderBottom: `1px solid ${monitorTheme.sidebarBorder}`,
            padding: designTokens.space[7],
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigateTo('/ai-step2/monitor?mode=list')}
              style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
              aria-label="Ir para home do monitor"
            >
              <TopBarLogo height={24} maxWidth={156} />
            </button>
            <div style={{ minWidth: 180 }}>
              <SidebarFooter />
            </div>
          </div>
          <nav
            aria-label="Navegação do dashboard"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 2,
            }}
          >
            <NavSections mainNav={mainNav} isAdmin={isAdmin} compact />
          </nav>
        </header>
        <main style={{ background: monitorTheme.pageBg, padding: designTokens.space[8] }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <SessionBanner />
            {children}
          </div>
        </main>
      </div>
    )
  }

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

          <NavSections mainNav={mainNav} isAdmin={isAdmin} />

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
