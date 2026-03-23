import { Component } from "react";
import { OnboardingProvider, useOnboarding } from "./context/OnboardingContext";
import PageTransition from "./components/PageTransition";
import Etapa1Hero from "./pages/Etapa1Hero";
import Etapa2 from "./pages/Etapa2";
import Etapa3 from "./pages/Etapa3";
import Etapa4 from "./pages/Etapa4";
import Etapa5 from "./pages/Etapa5";
import Etapa6 from "./pages/Etapa6";
import Etapa7 from "./pages/Etapa7";
import EtapaFinal from "./pages/EtapaFinal";

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
    console.error("[CRASH]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: "#FF4444", background: "#0A0A0A", minHeight: "100vh", fontFamily: "monospace" }}>
          <h1>ERRO NO COMPONENTE</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#AAAAAA", marginTop: 20 }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: "12px 24px", background: "#E63333", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
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
  console.log("[STEP]", step);
  switch (step) {
    case 1: return <Etapa1Hero />;
    case 2: return <ErrorBoundary key="e2"><Etapa2 /></ErrorBoundary>;
    case 3: return <ErrorBoundary key="e3"><Etapa3 /></ErrorBoundary>;
    case 4: return <ErrorBoundary key="e4"><Etapa4 /></ErrorBoundary>;
    case 5: return <ErrorBoundary key="e5"><Etapa5 /></ErrorBoundary>;
    case 6: return <ErrorBoundary key="e6"><Etapa6 /></ErrorBoundary>;
    case 7: return <ErrorBoundary key="e7"><Etapa7 /></ErrorBoundary>;
    case "final": return <ErrorBoundary key="ef"><EtapaFinal /></ErrorBoundary>;
    default: return <Etapa1Hero />;
  }
}

function OnboardingFlow() {
  const { currentStep, direction } = useOnboarding();

  return (
    <PageTransition pageKey={currentStep} direction={direction}>
      <StepRenderer step={currentStep} />
    </PageTransition>
  );
}

export default function App() {
  return (
    <OnboardingProvider>
      <ErrorBoundary>
        <OnboardingFlow />
      </ErrorBoundary>
    </OnboardingProvider>
  );
}
