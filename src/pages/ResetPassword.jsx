import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import TopBarLogo from '../components/TopBarLogo'
import { DashboardButton, InlineNotice } from '../components/dashboard'
import { designTokens } from '../theme/design-tokens'
import { dashboardMotion, focusVisibleStyle } from '../theme/dashboard-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { getAuthClient, hasAuthEnv } from '../lib/auth-client'

const MIN_PASSWORD = 6

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
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const requestedType = searchParams.get('type')
  const isInvite = requestedType === 'invite'
  const envError = !hasAuthEnv()
  const authClient = envError ? null : getAuthClient()
  const [status, setStatus] = useState(envError ? 'invalid' : 'loading')
  const [errorMessage, setErrorMessage] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const processedUrlRef = useRef(null)
  const validatedLinkRef = useRef(false)
  const passwordFieldId = useId()
  const confirmFieldId = useId()

  useEffect(() => {
    if (envError || !authClient) return

    const urlKey = `${location.search}${location.hash}`
    if (processedUrlRef.current === urlKey) return
    processedUrlRef.current = urlKey

    const tokens = extractTokensFromHash()
    if (!tokens) {
      if (validatedLinkRef.current && !location.hash) return
      validatedLinkRef.current = false
      setStatus('invalid')
      setErrorMessage('Link inválido ou já utilizado. Solicite um novo e-mail de redefinição.')
      return
    }
    if (tokens.errorDescription) {
      validatedLinkRef.current = false
      setStatus('invalid')
      setErrorMessage(decodeURIComponent(tokens.errorDescription.replace(/\+/g, ' ')))
      return
    }

    setStatus('loading')
    setErrorMessage(null)
    authClient.auth
      .setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
      .then(({ error }) => {
        if (error) throw error
        validatedLinkRef.current = true
        navigate(isInvite ? '/reset-password?type=invite' : '/reset-password', { replace: true })
        setStatus('ready')
      })
      .catch((err) => {
        validatedLinkRef.current = false
        setStatus('invalid')
        setErrorMessage(err?.message || 'Não foi possível validar o link. Solicite um novo e-mail.')
      })
  }, [authClient, envError, isInvite, location.hash, location.search, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || status !== 'ready' || !authClient) return
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
              onClick={() => navigate('/forgot-password', { replace: true })}
              variant="primary"
              size="lg"
            >
              Solicitar novo link
            </DashboardButton>
          </>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label
                htmlFor={passwordFieldId}
                style={{
                  color: monitorTheme.textSecondary,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Nova senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={passwordFieldId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                  minLength={MIN_PASSWORD}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={{
                    width: '100%',
                    background: monitorTheme.controlBg,
                    border: `1px solid ${monitorTheme.controlBorder}`,
                    borderRadius: monitorRadius.md,
                    color: monitorTheme.controlText,
                    font: 'inherit',
                    fontSize: 13,
                    lineHeight: 1.45,
                    padding: '10px 44px 10px 12px',
                    transition: dashboardMotion.fast,
                    boxSizing: 'border-box',
                    ...(passwordFocused ? focusVisibleStyle : null),
                  }}
                />
                <DashboardButton
                  type="button"
                  variant="icon"
                  size="sm"
                  icon={showPassword ? EyeOff : Eye}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={submitting || !password}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 6,
                    width: 32,
                    minHeight: 32,
                    height: 32,
                    transform: 'translateY(-50%)',
                    color: monitorTheme.textSecondary,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label
                htmlFor={confirmFieldId}
                style={{
                  color: monitorTheme.textSecondary,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Confirmar senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={confirmFieldId}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting}
                  required
                  minLength={MIN_PASSWORD}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  style={{
                    width: '100%',
                    background: monitorTheme.controlBg,
                    border: `1px solid ${monitorTheme.controlBorder}`,
                    borderRadius: monitorRadius.md,
                    color: monitorTheme.controlText,
                    font: 'inherit',
                    fontSize: 13,
                    lineHeight: 1.45,
                    padding: '10px 44px 10px 12px',
                    transition: dashboardMotion.fast,
                    boxSizing: 'border-box',
                    ...(confirmFocused ? focusVisibleStyle : null),
                  }}
                />
                <DashboardButton
                  type="button"
                  variant="icon"
                  size="sm"
                  icon={showConfirm ? EyeOff : Eye}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm((current) => !current)}
                  disabled={submitting || !confirm}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 6,
                    width: 32,
                    minHeight: 32,
                    height: 32,
                    transform: 'translateY(-50%)',
                    color: monitorTheme.textSecondary,
                  }}
                />
              </div>
            </div>

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
              onClick={() => navigate('/login', { replace: true })}
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
