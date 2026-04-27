import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import TopBarLogo from '../components/TopBarLogo'
import { DashboardButton, DashboardField, InlineNotice } from '../components/dashboard'
import { designTokens } from '../theme/design-tokens'
import { dashboardMotion, focusVisibleStyle } from '../theme/dashboard-tokens'
import { monitorTheme, monitorRadius } from './AiStep2Monitor/theme'
import { useAuth } from '../context/AuthContext'
import { recordDashboardActivity } from '../lib/dashboard-activity'

const DEFAULT_NEXT = '/ai-step2/monitor'
const RATE_LIMIT_COOLDOWN_SECONDS = 15
const RATE_LIMIT_MESSAGE = 'Muitas tentativas de login. Aguarde alguns instantes e tente novamente.'

function isRateLimitError(err) {
  const status = Number(err?.status ?? err?.statusCode ?? 0)
  return status === 429
}

function readNext(searchParams) {
  const next = searchParams.get('next')
  if (!next || !next.startsWith('/')) return DEFAULT_NEXT
  return next
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isAuthLoading, envError, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const redirectedRef = useRef(false)
  const submitInFlightRef = useRef(false)
  const passwordFieldId = useId()

  const next = useMemo(() => readNext(searchParams), [searchParams])
  const isCoolingDown = cooldownSeconds > 0
  const authControlsDisabled = submitting || envError || isCoolingDown

  useEffect(() => {
    if (redirectedRef.current) return
    if (!isAuthLoading && isAuthenticated) {
      redirectedRef.current = true
      navigate(next, { replace: true })
    }
  }, [isAuthenticated, isAuthLoading, navigate, next])

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined
    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [cooldownSeconds])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitInFlightRef.current || submitting || envError || isCoolingDown) return
    submitInFlightRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await signInWithPassword({ email: email.trim(), password })
      await recordDashboardActivity('login', { path: next, force: true })
      redirectedRef.current = true
      navigate(next, { replace: true })
    } catch (err) {
      const message = err?.message || ''
      if (isRateLimitError(err)) {
        setError(RATE_LIMIT_MESSAGE)
        setCooldownSeconds(RATE_LIMIT_COOLDOWN_SECONDS)
      } else if (message.toLowerCase().includes('invalid')) {
        setError('E-mail ou senha invalidos.')
      } else {
        setError(message || 'Nao foi possivel entrar. Tente novamente.')
      }
    } finally {
      submitInFlightRef.current = false
      setSubmitting(false)
    }
  }

  const disabled = submitting || envError || isCoolingDown || !email || !password

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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Acesso ao painel</h1>
          <p style={{ margin: 0, fontSize: 13, color: monitorTheme.textSecondary }}>
            Entre com sua conta para continuar.
          </p>
        </div>

        {envError && (
          <InlineNotice tone="error">
            Configuração de autenticação ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
          </InlineNotice>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DashboardField
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={authControlsDisabled}
            required
          />

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
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id={passwordFieldId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authControlsDisabled}
                required
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
                disabled={authControlsDisabled || !password}
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
            {submitting ? 'Entrando…' : isCoolingDown ? `Aguarde ${cooldownSeconds}s` : 'Entrar'}
          </DashboardButton>

          <DashboardButton
            type="button"
            onClick={() => {
              navigate('/forgot-password')
            }}
            variant="ghost"
            size="sm"
            style={{
              marginTop: 2,
              textDecoration: 'underline',
              alignSelf: 'center',
            }}
          >
            Esqueci minha senha
          </DashboardButton>
        </form>
      </div>
    </div>
  )
}
