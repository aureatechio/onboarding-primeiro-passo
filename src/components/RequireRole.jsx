import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { TYPE, designTokens } from '../theme/design-tokens'
import { monitorRadius, monitorTheme } from '../pages/AiStep2Monitor/theme'

export default function RequireRole({ roles, children }) {
  const { isAuthLoading, hasRole } = useAuth()
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (isAuthLoading) return null
  if (hasRole(allowedRoles)) return children

  return (
    <div
      style={{
        minHeight: '100vh',
        background: monitorTheme.layoutBg,
        color: monitorTheme.textPrimary,
        fontFamily: designTokens.fontFamily.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: monitorTheme.cardMutedBg,
          border: `1px solid ${monitorTheme.border}`,
          borderRadius: monitorRadius.xl,
          padding: 28,
          display: 'grid',
          gap: 14,
        }}
      >
        <ShieldAlert size={28} color={monitorTheme.dangerTextStrong} />
        <h1 style={{ ...TYPE.h3, margin: 0, color: monitorTheme.textPrimary }}>Acesso restrito</h1>
        <p style={{ ...TYPE.bodySmall, margin: 0, color: monitorTheme.textSecondary }}>
          Sua conta nao tem permissao para abrir esta area.
        </p>
      </div>
    </div>
  )
}
