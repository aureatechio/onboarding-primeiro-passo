import { useState } from 'react'
import { useNavigate } from 'react-router'
import TopBarLogo from '../components/TopBarLogo'
import { DashboardButton, DashboardField, InlineNotice } from '../components/dashboard'
import { designTokens } from '../theme/design-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { getAuthClient, hasAuthEnv } from '../lib/auth-client'

const DEFAULT_DASHBOARD_URL = 'https://acelerai-primeiro-passo.vercel.app'

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function isLocalOrigin(origin) {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function getPasswordResetRedirectTo() {
  const configuredBaseUrl = normalizeBaseUrl(
    import.meta.env.VITE_DASHBOARD_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_ONBOARDING_BASE_URL
  )
  if (configuredBaseUrl) return `${configuredBaseUrl}/reset-password`

  const currentOrigin = window.location.origin
  if (!isLocalOrigin(currentOrigin)) return `${currentOrigin}/reset-password`

  return `${DEFAULT_DASHBOARD_URL}/reset-password`
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const envError = !hasAuthEnv()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const authClient = getAuthClient()
    if (submitting || envError || !authClient) return
    setSubmitting(true)
    setError(null)
    try {
      const redirectTo = getPasswordResetRedirectTo()
      const { error: apiError } = await authClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (apiError) throw apiError
      setSubmitted(true)
    } catch (err) {
      setError(err?.message || 'Nao foi possivel enviar o link. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || envError || !email

  return (
    <div
      style={{
        minHeight: '100vh',
        background: monitorTheme.layoutBg,
        color: monitorTheme.textPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: designTokens.fontFamily.primary,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: monitorTheme.cardMutedBg,
          border: `1px solid ${monitorTheme.border}`,
          borderRadius: monitorRadius.xl,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TopBarLogo height={22} maxWidth={140} />
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Recuperar senha</h1>
            <p style={{ margin: 0, fontSize: 13, color: monitorTheme.textSecondary }}>
              Informe seu e-mail para receber o link de redefinicao.
            </p>
          </div>

          {envError && (
            <InlineNotice tone="error">
              Configuracao de autenticacao ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
            </InlineNotice>
        )}

        {submitted ? (
          <InlineNotice tone="success">
            Se este e-mail existir em nossa base, voce recebera um link para redefinir a senha em instantes. Verifique tambem a caixa de spam.
          </InlineNotice>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <DashboardField
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || envError}
              required
            />

            {error && (
              <InlineNotice tone="error">
                {error}
              </InlineNotice>
            )}

            <DashboardButton
              type="submit"
              disabled={disabled}
              variant="primary"
              size="lg"
              style={{ marginTop: 4 }}
            >
              {submitting ? 'Enviando...' : 'Enviar link'}
            </DashboardButton>
          </form>
        )}

        <DashboardButton
          type="button"
          onClick={() => navigate('/login')}
          variant="ghost"
          size="sm"
          style={{
            textDecoration: 'underline',
            alignSelf: 'center',
          }}
        >
          Voltar para login
        </DashboardButton>
      </div>
    </div>
  )
}
