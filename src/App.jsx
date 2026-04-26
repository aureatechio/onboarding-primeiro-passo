import { Component, useEffect, useRef, useState } from 'react';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import { CopyProvider } from './context/CopyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import PageTransition from './components/PageTransition';
import Etapa1Hero from './pages/Etapa1Hero';
import Etapa2 from './pages/Etapa2';
import Etapa3 from './pages/Etapa3';
import Etapa4 from './pages/Etapa4';
import Etapa5 from './pages/Etapa5';
import Etapa6 from './pages/Etapa6';
import Etapa62 from './pages/Etapa62';
import EtapaFinal from './pages/EtapaFinal';
import AiStep2Monitor from './pages/AiStep2Monitor';
import PerplexityConfigPage from './pages/AiStep2Monitor/PerplexityConfigPage';
import NanoBananaConfigPage from './pages/AiStep2Monitor/NanoBananaConfigPage';
import CopyEditor from './pages/CopyEditor';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RequireRole from './components/RequireRole';
import UsersList from './pages/Users/UsersList';
import Profile from './pages/Profile';

const PROTECTED_PREFIXES = ['/ai-step2/', '/copy-editor', '/users', '/profile'];

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function AuthSplash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080C14',
        color: '#E6EDF3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      Carregando sessao...
    </div>
  );
}

// Error boundary pra pegar crashes silenciosos
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[CRASH]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#FF4444', background: '#0A0A0A', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1>ERRO NO COMPONENTE</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#AAAAAA', marginTop: 20 }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '12px 24px', background: '#E8356D', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StepRenderer({ step }) {
  console.log('[STEP]', step);
  switch (step) {
    case 1: return <Etapa1Hero />;
    case 2: return <ErrorBoundary key="e2"><Etapa2 /></ErrorBoundary>;
    case 3: return <ErrorBoundary key="e3"><Etapa3 /></ErrorBoundary>;
    case 4: return <ErrorBoundary key="e4"><Etapa4 /></ErrorBoundary>;
    case 5: return <ErrorBoundary key="e5"><Etapa5 /></ErrorBoundary>;
    case 6: return <ErrorBoundary key="e6"><Etapa6 /></ErrorBoundary>;
    case 7: return <ErrorBoundary key="e62"><Etapa62 /></ErrorBoundary>;
    case 'final': return <ErrorBoundary key="ef"><EtapaFinal /></ErrorBoundary>;
    default: return <Etapa1Hero />;
  }
}

function OnboardingFlow() {
  const {
    currentStep,
    direction,
    isHydrating,
    hydrationError,
    retryHydration,
  } = useOnboarding();

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
            Primeiro Passo
          </p>
          <h1 className="text-xl font-semibold mb-2">Carregando seu onboarding...</h1>
          <p className="text-sm text-muted-foreground">
            Estamos preparando os dados da sua compra.
          </p>
        </div>
      </div>
    );
  }

  if (hydrationError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6">
          <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
            Primeiro Passo
          </p>
          <h1 className="text-xl font-semibold mb-2">Nao foi possivel abrir o onboarding</h1>
          <p className="text-sm text-muted-foreground">{hydrationError}</p>
          <button
            type="button"
            onClick={retryHydration}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#E8356D',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition pageKey={currentStep} direction={direction}>
      <StepRenderer step={currentStep} />
    </PageTransition>
  );
}

function AppRoutes() {
  const [currentLocation, setCurrentLocation] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }))
  const { isAuthenticated, isAuthLoading } = useAuth()
  const redirectedRef = useRef(null)

  useEffect(() => {
    const syncLocation = () => {
      setCurrentLocation({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      })
      redirectedRef.current = null
    }

    window.addEventListener('popstate', syncLocation)
    window.addEventListener('aurea:location-change', syncLocation)

    return () => {
      window.removeEventListener('popstate', syncLocation)
      window.removeEventListener('aurea:location-change', syncLocation)
    }
  }, [])

  const pathname = currentLocation.pathname
  const search = currentLocation.search

  if (pathname === '/' && !search) {
    const target = '/ai-step2/monitor'
    if (redirectedRef.current !== target) {
      redirectedRef.current = target
      window.history.replaceState({}, '', target)
      window.dispatchEvent(new Event('aurea:location-change'))
    }
    return null
  }

  if (pathname.startsWith('/login')) {
    return <Login />
  }

  if (pathname.startsWith('/forgot-password')) {
    return <ForgotPassword />
  }

  if (pathname.startsWith('/reset-password')) {
    return <ResetPassword />
  }

  if (isProtectedPath(pathname)) {
    if (isAuthLoading) {
      return <AuthSplash />
    }
    if (!isAuthenticated) {
      const fullPath = `${pathname}${search}`
      const target = `/login?next=${encodeURIComponent(fullPath)}`
      if (redirectedRef.current !== target) {
        redirectedRef.current = target
        window.history.replaceState({}, '', target)
        window.dispatchEvent(new Event('aurea:location-change'))
      }
      return null
    }
  }

  if (pathname.startsWith('/ai-step2/perplexity-config')) {
    return (
      <RequireRole roles={['admin']}>
        <ErrorBoundary>
          <PerplexityConfigPage />
        </ErrorBoundary>
      </RequireRole>
    );
  }

  if (pathname.startsWith('/ai-step2/nanobanana-config')) {
    return (
      <RequireRole roles={['admin']}>
        <ErrorBoundary>
          <NanoBananaConfigPage />
        </ErrorBoundary>
      </RequireRole>
    );
  }

  if (pathname.startsWith('/ai-step2/monitor')) {
    return (
      <ErrorBoundary>
        <AiStep2Monitor />
      </ErrorBoundary>
    );
  }

  if (pathname.startsWith('/copy-editor')) {
    return (
      <RequireRole roles={['admin']}>
        <ErrorBoundary>
          <CopyEditor />
        </ErrorBoundary>
      </RequireRole>
    );
  }

  if (pathname.startsWith('/users')) {
    return (
      <RequireRole roles={['admin']}>
        <ErrorBoundary>
          <UsersList />
        </ErrorBoundary>
      </RequireRole>
    );
  }

  if (pathname.startsWith('/profile')) {
    return (
      <RequireRole roles={['admin', 'operator', 'viewer']}>
        <ErrorBoundary>
          <Profile />
        </ErrorBoundary>
      </RequireRole>
    );
  }

  return (
    <CopyProvider>
      <OnboardingProvider>
        <ErrorBoundary>
          <OnboardingFlow />
        </ErrorBoundary>
      </OnboardingProvider>
    </CopyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
