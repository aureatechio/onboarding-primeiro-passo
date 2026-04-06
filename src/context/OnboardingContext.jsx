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
const STORAGE_KEY_BASE = 'primeiro-passo-state';

const STEP_TITLES = {
  1: 'Bem-vindo',
  2: 'Como funciona sua campanha',
  3: 'Prazos e combinados',
  4: 'Regras de uso',
  5: 'Sua presenca digital',
  6: 'Sua identidade visual (6.1)',
  7: 'Bonificacao de prazo (6.2)',
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
  atendenteGenero: 'f',
  trafficChoice: null,
  productionPath: null,
  identityBonusChoice: null,
  identityBonusLogoName: '',
  identityBonusExtractedColors: [],
  identityBonusCustomColors: [],
  identityBonusColors: [],
  identityBonusFont: '',
  identityBonusImagesCount: 0,
  identityBonusPending: false,
  campaignNotes: '',
  campaignBriefMode: null,
  campaignBriefText: '',
  campaignCompanySite: '',
  campaignBriefAudioUrl: '',
  campaignBriefAudioDurationSec: 0,
  campaignBriefTranscript: null,
  campaignBriefTranscriptStatus: null,
  campaignGeneratedBriefing: null,
  campaignGeneratedInsights: [],
  campaignBriefCitations: [],
  campaignBriefGenerationStatus: null,
  campaignBriefErrorCode: null,
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

function getValidCompraIdFromQuery() {
  const compraId = parseCompraIdFromQuery();
  if (!compraId) return null;
  if (!UUID_REGEX.test(compraId)) return null;
  return compraId;
}

function getStorageKey(compraId) {
  if (!compraId) return null;
  return `${STORAGE_KEY_BASE}:${compraId}`;
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
    atendenteGenero: payload?.atendenteGenero === 'm' ? 'm' : 'f',
    trafficChoice: null,
    productionPath: null,
  };
}

function loadSavedState(compraId) {
  try {
    if (typeof window === 'undefined') return null;
    const key = getStorageKey(compraId);
    if (!key) return null;
    const saved = window.localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return {
      currentStep: parsed.currentStep,
      completedSteps: new Set(parsed.completedSteps || []),
      userData: parsed.userData || INITIAL_USER_DATA,
    };
  } catch {
    return null;
  }
}

function saveState(compraId, currentStep, completedSteps, userData) {
  try {
    if (typeof window === 'undefined') return;
    const key = getStorageKey(compraId);
    if (!key) return;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        compraId,
        currentStep,
        completedSteps: [...completedSteps],
        userData,
        savedAt: Date.now(),
      })
    );
  } catch {
    // localStorage pode falhar em modo privado.
  }
}

export function OnboardingProvider({ children }) {
  const initialCompraId = getValidCompraIdFromQuery();
  const saved = loadSavedState(initialCompraId);

  const [storageCompraId, setStorageCompraId] = useState(initialCompraId);
  const [currentStep, setCurrentStep] = useState(saved?.currentStep || 1);
  const [completedSteps, setCompletedSteps] = useState(saved?.completedSteps || new Set());
  const [direction, setDirection] = useState(1);
  const [userData, setUserData] = useState(saved?.userData || INITIAL_USER_DATA);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState(null);
  const [hydrationCompraId, setHydrationCompraId] = useState(null);

  // Use ref to always have latest currentStep in callbacks
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;
  const storageCompraIdRef = useRef(storageCompraId);
  storageCompraIdRef.current = storageCompraId;

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

  const resetOnboarding = useCallback(() => {
    const key = getStorageKey(storageCompraId);
    if (key) window.localStorage.removeItem(key);
    window.location.reload();
  }, [storageCompraId]);

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

    if (compraId !== storageCompraIdRef.current) {
      const nextSaved = loadSavedState(compraId);
      setStorageCompraId(compraId);
      setDirection(1);
      setCurrentStep(nextSaved?.currentStep || 1);
      setCompletedSteps(nextSaved?.completedSteps || new Set());
      setUserData(nextSaved?.userData || INITIAL_USER_DATA);
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

  useEffect(() => {
    saveState(storageCompraId, currentStep, completedSteps, userData);
  }, [storageCompraId, currentStep, completedSteps, userData]);

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
      resetOnboarding,
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
      resetOnboarding,
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
