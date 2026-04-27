import { useEffect, useRef, useState } from 'react'
import TopBarLogo from '../components/TopBarLogo'
import { DashboardButton, DashboardField, InlineNotice } from '../components/dashboard'
import { designTokens } from '../theme/design-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { authClient, hasAuthEnv } from '../lib/auth-client'

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
  if (!accessToken || !refreshToken || !['recovery', 'invite'].includes(type)) return null
  return { accessToken, refreshToken, type }
}

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search)
  const requestedType = params.get('type')
  const isInvite = requestedType === 'invite'
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
      setErrorMessage('Link inválido ou já utilizado. Solicite um novo e-mail de redefinição.')
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
        window.history.replaceState({}, '', isInvite ? '/reset-password?type=invite' : '/reset-password')
        setStatus('ready')
      })
      .catch((err) => {
        setStatus('invalid')
        setErrorMessage(err?.message || 'Não foi possível validar o link. Solicite um novo e-mail.')
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
      setFormError('As senhas não conferem.')
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
      setFormError(err?.message || 'Não foi possível atualizar a senha. Tente novamente.')
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isInvite ? 'Defina sua senha' : 'Nova senha'}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: monitorTheme.textSecondary }}>
            {isInvite ? 'Crie sua senha para acessar o dashboard.' : 'Defina uma nova senha para sua conta.'}
          </p>
        </div>

          {envError && (
            <InlineNotice tone="error">
              Configuração de autenticação ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
            </InlineNotice>
        )}

        {status === 'loading' && (
          <p style={{ fontSize: 13, color: monitorTheme.textSecondary, margin: 0 }}>
            Validando link…
          </p>
        )}

        {status === 'invalid' && (
          <>
            <InlineNotice tone="error">
              {errorMessage || 'Link inválido ou expirado.'}
            </InlineNotice>
            <DashboardButton
              type="button"
              onClick={() => navigateReplace('/forgot-password')}
              variant="primary"
              size="lg"
            >
              Solicitar novo link
            </DashboardButton>
          </>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <DashboardField
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
              minLength={MIN_PASSWORD}
            />

            <DashboardField
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              required
              minLength={MIN_PASSWORD}
            />

            {formError && (
              <InlineNotice tone="error">
                {formError}
              </InlineNotice>
            )}

            <DashboardButton
              type="submit"
              disabled={submitting}
              variant="primary"
              size="lg"
              style={{ marginTop: 4 }}
            >
              {submitting ? 'Salvando…' : 'Salvar nova senha'}
            </DashboardButton>
          </form>
        )}

        {status === 'done' && (
          <>
            <InlineNotice tone="success">
              Senha atualizada com sucesso. Você já pode entrar com a nova senha.
            </InlineNotice>
            <DashboardButton
              type="button"
              onClick={() => navigateReplace('/login')}
              variant="primary"
              size="lg"
            >
              Ir para login
            </DashboardButton>
          </>
        )}
      </div>
    </div>
  )
}
