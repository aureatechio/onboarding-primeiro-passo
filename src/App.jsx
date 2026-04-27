import { Component } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router';
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

function RequireAuthRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return <AuthSplash />
  }

  if (!isAuthenticated) {
    const fullPath = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(fullPath)}`} replace />
  }

  return children
}

function RequireRoleRoute({ roles, children }) {
  return <RequireRole roles={roles}>{children}</RequireRole>
}

function DashboardRoute({ children, roles }) {
  const content = roles ? <RequireRoleRoute roles={roles}>{children}</RequireRoleRoute> : children
  return <RequireAuthRoute>{content}</RequireAuthRoute>
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

function OnboardingRoute() {
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

function RootRoute() {
  const [searchParams] = useSearchParams()
  if (searchParams.has('compra_id')) {
    return <OnboardingRoute />
  }
  return <Navigate to="/ai-step2/monitor" replace />
}

function LegacyMonitorRoute() {
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job_id')

  if (jobId) {
    const next = new URLSearchParams(searchParams)
    next.delete('job_id')
    next.delete('mode')
    const query = next.toString()
    return <Navigate to={`/ai-step2/monitor/jobs/${encodeURIComponent(jobId)}${query ? `?${query}` : ''}`} replace />
  }

  return (
    <DashboardRoute>
      <ErrorBoundary>
        <AiStep2Monitor />
      </ErrorBoundary>
    </DashboardRoute>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/ai-step2/monitor" element={<LegacyMonitorRoute />} />
      <Route
        path="/ai-step2/monitor/jobs/:jobId"
        element={(
          <DashboardRoute>
            <ErrorBoundary>
              <AiStep2Monitor />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route
        path="/ai-step2/perplexity-config"
        element={(
          <DashboardRoute roles={['admin']}>
            <ErrorBoundary>
              <PerplexityConfigPage />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route
        path="/ai-step2/nanobanana-config"
        element={(
          <DashboardRoute roles={['admin']}>
            <ErrorBoundary>
              <NanoBananaConfigPage />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route
        path="/copy-editor"
        element={(
          <DashboardRoute roles={['admin']}>
            <ErrorBoundary>
              <CopyEditor />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route
        path="/users"
        element={(
          <DashboardRoute roles={['admin']}>
            <ErrorBoundary>
              <UsersList />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route
        path="/profile"
        element={(
          <DashboardRoute roles={['admin', 'operator', 'viewer']}>
            <ErrorBoundary>
              <Profile />
            </ErrorBoundary>
          </DashboardRoute>
        )}
      />
      <Route path="*" element={<OnboardingRoute />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
