import { useState } from 'react'
import TopBarLogo from '../components/TopBarLogo'
import { designTokens } from '../theme/design-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { authClient, hasAuthEnv } from '../lib/auth-client'

const PRIMARY = '#384ffe'

function navigatePush(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event('aurea:location-change'))
}

export default function ForgotPassword() {
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
            Informe seu e-mail para receber o link de redefinicao.
          </p>
        </div>

        {envError && (
          <div
            role="alert"
            style={{
              background: monitorTheme.dangerBg,
              border: `1px solid ${monitorTheme.dangerBorder}`,
              color: monitorTheme.dangerTextStrong,
              borderRadius: monitorRadius.md,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Configuracao de autenticacao ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
          </div>
        )}

        {submitted ? (
          <div
            role="status"
            style={{
              background: 'rgba(63,185,80,0.08)',
              border: '1px solid rgba(63,185,80,0.22)',
              color: '#3FB950',
              borderRadius: monitorRadius.md,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Se este e-mail existir em nossa base, voce recebera um link para redefinir a senha em instantes. Verifique tambem a caixa de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: monitorTheme.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                E-mail
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting || envError}
                required
                style={{
                  background: monitorTheme.controlBg,
                  border: `1px solid ${monitorTheme.controlBorder}`,
                  borderRadius: monitorRadius.md,
                  padding: '10px 12px',
                  color: monitorTheme.controlText,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </label>

            {error && (
              <div
                role="alert"
                style={{
                  background: monitorTheme.dangerBg,
                  border: `1px solid ${monitorTheme.dangerBorder}`,
                  color: monitorTheme.dangerTextStrong,
                  borderRadius: monitorRadius.md,
                  padding: 10,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              style={{
                marginTop: 4,
                padding: '11px 14px',
                borderRadius: monitorRadius.md,
                border: 'none',
                background: disabled ? 'rgba(56,79,254,0.4)' : PRIMARY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigatePush('/login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: monitorTheme.textSecondary,
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 4,
            alignSelf: 'center',
          }}
        >
          Voltar para login
        </button>
      </div>
    </div>
  )
}
