import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';

const OnboardingContext = createContext(null);

const TOTAL_STEPS = 7;

const STEP_TITLES = {
  1: 'Bem-vindo',
  2: 'Como funciona sua campanha',
  3: 'Prazos e combinados',
  4: 'Regras de uso',
  5: 'Sua presenca digital',
  6: 'Sua identidade visual',
  7: 'Modo avancado',
  final: 'Resumo final',
};

const INITIAL_USER_DATA = {
  clientName: 'Cliente',
  celebName: 'Celebridade contratada',
  praca: 'Praca contratada',
  segmento: 'Segmento contratado',
  pacote: 'Pacote contratado',
  vigencia: 'Periodo contratado',
  atendente: 'Equipe Acelerai',
  trafficChoice: null,
  productionPath: null,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeString(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function parseCompraIdFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const compraId = (params.get('compra_id') || '').trim();
    return compraId || null;
  } catch {
    return null;
  }
}

function mapRemotePayloadToUserData(payload) {
  return {
    ...INITIAL_USER_DATA,
    clientName: sanitizeString(payload?.clientName, INITIAL_USER_DATA.clientName),
    celebName: sanitizeString(payload?.celebName, INITIAL_USER_DATA.celebName),
    praca: sanitizeString(payload?.praca, INITIAL_USER_DATA.praca),
    segmento: sanitizeString(payload?.segmento, INITIAL_USER_DATA.segmento),
    pacote: sanitizeString(payload?.pacote, INITIAL_USER_DATA.pacote),
    vigencia: sanitizeString(payload?.vigencia, INITIAL_USER_DATA.vigencia),
    atendente: sanitizeString(payload?.atendente, INITIAL_USER_DATA.atendente),
    trafficChoice: null,
    productionPath: null,
  };
}

export function OnboardingProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [direction, setDirection] = useState(1);
  const [userData, setUserData] = useState(INITIAL_USER_DATA);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState(null);
  const [hydrationCompraId, setHydrationCompraId] = useState(null);

  // Use ref to always have latest currentStep in callbacks
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const completeStep = useCallback((step) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    const step = currentStepRef.current;
    completeStep(step);
    const next = step === 'final' ? 'done' : step === 7 ? 'final' : step + 1;
    setDirection(1);
    setCurrentStep(next);
    window.scrollTo({ top: 0 });
  }, [completeStep]);

  const goToStep = useCallback((step) => {
    const curr = currentStepRef.current;
    setDirection(step > curr ? 1 : -1);
    setCurrentStep(step);
    window.scrollTo({ top: 0 });
  }, []);

  const updateUserData = useCallback((updates) => {
    setUserData((prev) => ({ ...prev, ...updates }));
  }, []);

  const hydrateFromQueryParam = useCallback(async () => {
    const compraId = parseCompraIdFromQuery();
    setHydrationError(null);
    setIsHydrating(true);

    if (!compraId) {
      setHydrationError('Link invalido: compra_id ausente.');
      setIsHydrating(false);
      return;
    }

    if (!UUID_REGEX.test(compraId)) {
      setHydrationError('Link invalido: compra_id deve ser um UUID valido.');
      setIsHydrating(false);
      return;
    }

    const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
    if (!supabaseUrl) {
      setHydrationError('Configuracao ausente: VITE_SUPABASE_URL.');
      setIsHydrating(false);
      return;
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-onboarding-data?compra_id=${encodeURIComponent(compraId)}`
      );
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setHydrationError(
          payload?.message || 'Nao foi possivel carregar dados do onboarding para esta compra.'
        );
        setIsHydrating(false);
        return;
      }

      setUserData((prev) => ({
        ...prev,
        ...mapRemotePayloadToUserData(payload.data),
      }));
      setHydrationCompraId(compraId);
      setIsHydrating(false);
    } catch (error) {
      console.error('[onboarding] hydration failed:', error);
      setHydrationError('Falha de rede ao carregar onboarding. Tente novamente.');
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => {
    hydrateFromQueryParam();
  }, [hydrateFromQueryParam]);

  const value = useMemo(
    () => ({
      currentStep,
      completedSteps,
      direction,
      totalSteps: TOTAL_STEPS,
      stepTitles: STEP_TITLES,
      userData,
      goToStep,
      goNext,
      completeStep,
      updateUserData,
      isHydrating,
      hydrationError,
      hydrationCompraId,
      retryHydration: hydrateFromQueryParam,
    }),
    [
      currentStep,
      completedSteps,
      direction,
      userData,
      goToStep,
      goNext,
      completeStep,
      updateUserData,
      isHydrating,
      hydrationError,
      hydrationCompraId,
      hydrateFromQueryParam,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
