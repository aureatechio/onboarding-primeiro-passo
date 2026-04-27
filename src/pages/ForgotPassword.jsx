import { useState } from 'react'
import { useNavigate } from 'react-router'
import TopBarLogo from '../components/TopBarLogo'
import { DashboardButton, DashboardField, InlineNotice } from '../components/dashboard'
import { designTokens } from '../theme/design-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { authClient, hasAuthEnv } from '../lib/auth-client'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const envError = !hasAuthEnv()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || envError || !authClient) return
    setSubmitting(true)
    setError(null)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
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
              Informe seu e-mail para receber o link de redefinição.
            </p>
          </div>

          {envError && (
            <InlineNotice tone="error">
              Configuração de autenticação ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
            </InlineNotice>
        )}

        {submitted ? (
          <InlineNotice tone="success">
            Se este e-mail existir em nossa base, você receberá um link para redefinir a senha em instantes. Verifique também a caixa de spam.
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
              {submitting ? 'Enviando…' : 'Enviar link'}
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
