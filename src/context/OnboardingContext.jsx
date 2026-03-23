import { createContext, useContext, useState, useCallback, useRef } from "react";

const OnboardingContext = createContext(null);

const TOTAL_STEPS = 7;

const STEP_TITLES = {
  1: "Bem-vindo",
  2: "Como funciona sua campanha",
  3: "Prazos e combinados",
  4: "Regras de uso",
  5: "Sua presença digital",
  6: "Sua identidade visual",
  7: "Modo avançado",
  final: "Resumo final",
};

export function OnboardingProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [direction, setDirection] = useState(1);
  const [userData, setUserData] = useState({
    clientName: "Roberto",
    celebName: "Rodrigo Faro",
    praca: "São Paulo - Capital",
    segmento: "Odontologia",
    pacote: "2 vídeos (1 vertical + 1 horizontal) e 4 peças estáticas",
    vigencia: "3 meses",
    atendente: "Yasmin",
    trafficChoice: null,
    productionPath: null,
  });

  // Use ref to always have latest currentStep in callbacks
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const completeStep = useCallback((step) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    const step = currentStepRef.current;
    completeStep(step);
    const next = step === "final" ? "done" : step === 7 ? "final" : step + 1;
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

  return (
    <OnboardingContext.Provider
      value={{
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
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
