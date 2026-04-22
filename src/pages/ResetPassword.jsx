import { useEffect, useRef, useState } from 'react'
import TopBarLogo from '../components/TopBarLogo'
import { designTokens } from '../theme/design-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { authClient, hasAuthEnv } from '../lib/auth-client'

const PRIMARY = '#384ffe'
const MIN_PASSWORD = 6

function navigateReplace(path) {
  window.history.replaceState({}, '', path)
  window.dispatchEvent(new Event('aurea:location-change'))
}

function extractTokensFromHash() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const type = params.get('type')
  const errorDescription = params.get('error_description') || params.get('error')
  if (errorDescription) return { errorDescription }
  if (!accessToken || !refreshToken || type !== 'recovery') return null
  return { accessToken, refreshToken }
}

export default function ResetPassword() {
  const envError = !hasAuthEnv()
  const [status, setStatus] = useState(envError ? 'invalid' : 'loading')
  const [errorMessage, setErrorMessage] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const processedRef = useRef(false)

  useEffect(() => {
    if (envError || !authClient || processedRef.current) return
    processedRef.current = true

    const tokens = extractTokensFromHash()
    if (!tokens) {
      setStatus('invalid')
      setErrorMessage('Link invalido ou ja utilizado. Solicite um novo e-mail de redefinicao.')
      return
    }
    if (tokens.errorDescription) {
      setStatus('invalid')
      setErrorMessage(decodeURIComponent(tokens.errorDescription.replace(/\+/g, ' ')))
      return
    }

    authClient.auth
      .setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
      .then(({ error }) => {
        if (error) throw error
        window.history.replaceState({}, '', '/reset-password')
        setStatus('ready')
      })
      .catch((err) => {
        setStatus('invalid')
        setErrorMessage(err?.message || 'Nao foi possivel validar o link. Solicite um novo e-mail.')
      })
  }, [envError])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || status !== 'ready') return
    if (password.length < MIN_PASSWORD) {
      setFormError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirm) {
      setFormError('As senhas nao conferem.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const { error } = await authClient.auth.updateUser({ password })
      if (error) throw error
      await authClient.auth.signOut()
      setStatus('done')
    } catch (err) {
      setFormError(err?.message || 'Nao foi possivel atualizar a senha. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Nova senha</h1>
          <p style={{ margin: 0, fontSize: 13, color: monitorTheme.textSecondary }}>
            Defina uma nova senha para sua conta.
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

        {status === 'loading' && (
          <p style={{ fontSize: 13, color: monitorTheme.textSecondary, margin: 0 }}>
            Validando link...
          </p>
        )}

        {status === 'invalid' && (
          <>
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
              {errorMessage || 'Link invalido ou expirado.'}
            </div>
            <button
              type="button"
              onClick={() => navigateReplace('/forgot-password')}
              style={{
                padding: '11px 14px',
                borderRadius: monitorRadius.md,
                border: 'none',
                background: PRIMARY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Solicitar novo link
            </button>
          </>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: monitorTheme.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Nova senha
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
                minLength={MIN_PASSWORD}
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

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: monitorTheme.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Confirmar senha
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting}
                required
                minLength={MIN_PASSWORD}
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

            {formError && (
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
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4,
                padding: '11px 14px',
                borderRadius: monitorRadius.md,
                border: 'none',
                background: submitting ? 'rgba(56,79,254,0.4)' : PRIMARY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <>
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
              Senha atualizada com sucesso. Voce ja pode entrar com a nova senha.
            </div>
            <button
              type="button"
              onClick={() => navigateReplace('/login')}
              style={{
                padding: '11px 14px',
                borderRadius: monitorRadius.md,
                border: 'none',
                background: PRIMARY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ir para login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
