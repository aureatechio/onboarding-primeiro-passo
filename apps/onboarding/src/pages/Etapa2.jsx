import { useState, useCallback } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import SlideDots from "../components/SlideDots"
import SlideTransition from "../components/SlideTransition"
import NavButtons from "../components/NavButtons"
import QuizConfirmation from "../components/QuizConfirmation"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import BulletList from "../components/BulletList"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"

const TOTAL_SLIDES = 4

export default function Etapa2() {
  const { userData, goNext } = useOnboarding()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)
  const [quizReady, setQuizReady] = useState(false)
  const [processing, setProcessing] = useState(false)

  const celebName = userData.celebName
  const pacoteResumo = "2 vídeos (de 30 segundos) e 4 peças estáticas."

  const goToSlide = useCallback((index) => {
    setSlideDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentSlide])

  const nextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setSlideDirection(1)
      setCurrentSlide((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setShowQuiz(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentSlide])

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setSlideDirection(-1)
      setCurrentSlide((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentSlide])

  const handleQuizBack = useCallback(() => {
    setShowQuiz(false)
    setCurrentSlide(TOTAL_SLIDES - 1)
  }, [])

  const handleConfirmAndAdvance = useCallback(() => {
    setProcessing(true)
  }, [])

  const quizQuestions = [
    "Entendi que a Aceleraí produz os criativos com a celebridade e que a divulgação e o tráfego são de minha responsabilidade.",
    "Entendi que os criativos são produzidos a partir de gravações pré-realizadas pela celebridade, combinadas com o briefing da minha empresa.",
    "Entendi o que vou receber no meu pacote de campanha.",
  ]

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="check"
        title="Etapa 2 concluída!"
        description="Agora você sabe exatamente como funciona a sua campanha. No próximo passo, vamos alinhar os prazos e combinados."
      />
    )
  }

  // ── Slide contents ──
  const slideTag = `2.${currentSlide + 1}`

  const slideTitles = [
    "Entenda o que você contratou",
    "Como a celebridade aparece na sua campanha",
    "Seu pacote de campanha",
    "Seu resultado depende de nós dois",
  ]

  const slideContents = [
    // ── Slide 2.1 ──
    <div key="slide-1">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        A Aceleraí não é uma agência de publicidade tradicional. Nós produzimos os criativos com
        a celebridade, mas a divulgação, o planejamento e o tráfego pago ficam{" "}
        <strong style={{ color: COLORS.text }}>por sua conta</strong> (ou da sua agência/equipe de
        marketing).
      </p>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <p style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 14px 0" }}>
          PENSE ASSIM
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${COLORS.red}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
              }}
            >
              <Icon name="clapperboard" size={22} color={COLORS.red} />
            </div>
            <p style={{ color: COLORS.red, fontSize: 11, fontWeight: 800, margin: "0 0 2px 0", letterSpacing: "0.05em" }}>
              ACELERAÍ
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              Entrega a munição
            </p>
          </div>

          <Icon name="arrowRight" size={20} color={COLORS.textDim} />

          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${COLORS.accent}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
              }}
            >
              <Icon name="target" size={22} color={COLORS.accent} />
            </div>
            <p style={{ color: COLORS.accent, fontSize: 11, fontWeight: 800, margin: "0 0 2px 0", letterSpacing: "0.05em" }}>
              VOCÊ
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              Aponta e dispara
            </p>
          </div>
        </div>
      </div>
    </div>,

    // ── Slide 2.2 ──
    <div key="slide-2">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        A celebridade já realizou <strong style={{ color: COLORS.text }}>sessões de filmagem</strong>{" "}
        onde registramos diversos textos. A partir dessas gravações, combinamos com o{" "}
        <strong style={{ color: COLORS.text }}>briefing da sua empresa</strong> para criar os criativos
        da sua campanha.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {[
          { num: "1", title: "Gravação", desc: "A celebridade grava sessões de vídeo e foto em estúdio profissional" },
          { num: "2", title: "Seu briefing", desc: "Você envia as informações da sua empresa, produto e público-alvo" },
          { num: "3", title: "Produção", desc: "Nossa equipe combina as gravações com seu briefing para criar os criativos" },
          { num: "4", title: "Sua campanha", desc: "Você recebe os materiais prontos para rodar sua campanha" },
        ].map((step) => (
          <div
            key={step.num}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${COLORS.red}15`,
                border: `1px solid ${COLORS.red}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: COLORS.red,
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {step.num}
              </span>
            </div>
            <div>
              <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 3px 0" }}>
                {step.title}
              </p>
              <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        Assim, você tem acesso a materiais com uma celebridade por uma{" "}
        <strong style={{ color: COLORS.text }}>fração do custo</strong> de uma contratação direta.
      </p>
    </div>,

    // ── Slide 2.3 ──
    <div key="slide-3">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        No seu contrato, você tem direito a:
      </p>

      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.bg})`,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${COLORS.magenta}12`,
            border: `1px solid ${COLORS.magenta}25`,
            borderRadius: 100,
            padding: "4px 12px",
            marginBottom: 16,
          }}
        >
          <Icon name="star" size={12} color={COLORS.magenta} />
          <span
            style={{
              color: COLORS.magenta,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {celebName}
          </span>
        </div>

        <p style={{
          color: COLORS.text,
          fontSize: 18,
          fontWeight: 800,
          margin: "0 0 16px 0",
          lineHeight: 1.3,
          textAlign: "center",
        }}>
          {pacoteResumo}
        </p>
      </div>

      <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        Todos os materiais são produzidos pela nossa <strong style={{ color: COLORS.text }}>equipe de produção
        profissional</strong>, garantindo qualidade e consistência.
      </p>
    </div>,

    // ── Slide 2.4 ──
    <div key="slide-4">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        O sucesso da sua campanha é uma <strong style={{ color: COLORS.text }}>parceria</strong> entre a
        Aceleraí e a sua empresa. Cada lado tem um papel fundamental.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {/* Da nossa parte */}
        <div
          style={{
            background: `${COLORS.red}08`,
            border: `1px solid ${COLORS.red}20`,
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="clapperboard" size={18} color={COLORS.red} />
            <span style={{ color: COLORS.red, fontSize: 14, fontWeight: 800 }}>Da nossa parte</span>
          </div>
          <BulletList
            items={[
              "Produção dos criativos com a celebridade",
              "Edição e finalização profissional",
              "Entrega dentro do prazo combinado",
              "Suporte durante toda a campanha",
            ]}
            color={COLORS.red}
          />
        </div>

        {/* Da sua parte */}
        <div
          style={{
            background: `${COLORS.accent}08`,
            border: `1px solid ${COLORS.accent}20`,
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="target" size={18} color={COLORS.accent} />
            <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 800 }}>Da sua parte</span>
          </div>
          <BulletList
            items={[
              "Enviar o briefing completo da empresa",
              "Rodar a divulgação e o tráfego pago",
              "Responder os leads gerados pela campanha",
              "Manter comunicação ativa com nosso time",
            ]}
            color={COLORS.accent}
          />
        </div>
      </div>

      <div
        style={{
          background: `${COLORS.accent}10`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 10,
          padding: 14,
        }}
      >
        <p style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
          Quanto mais rápido a gente se comunicar, melhor vai ser o resultado.
        </p>
      </div>
    </div>,
  ]

  return (
    <PageLayout>
      <StepHeader title="Como funciona sua campanha" readTime="3 minutos" />

      {!showQuiz ? (
        <>
          <SlideDots total={TOTAL_SLIDES} current={currentSlide} onSelect={goToSlide} />

          <p
            style={{
              color: COLORS.textDim,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              margin: "0 0 6px 0",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {slideTag}
          </p>

          <h2
            style={{
              color: COLORS.text,
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 16px 0",
              letterSpacing: "-0.02em",
            }}
          >
            {slideTitles[currentSlide]}
          </h2>

          <SlideTransition
            slideKey={currentSlide}
            direction={slideDirection}
            onSwipeLeft={nextSlide}
            onSwipeRight={currentSlide > 0 ? prevSlide : undefined}
          >
            {slideContents[currentSlide]}
          </SlideTransition>

          <StickyFooter>
            <NavButtons
              onPrev={currentSlide > 0 ? prevSlide : undefined}
              onNext={nextSlide}
              nextLabel={currentSlide < TOTAL_SLIDES - 1 ? "Próximo" : "Ir para confirmação"}
            />
          </StickyFooter>
        </>
      ) : (
        <>
          <QuizConfirmation
            questions={quizQuestions}
            title="Confirme o entendimento"
            subtitle="Marque todos para avançar"
            icon="check"
            onAllConfirmed={(val) => setQuizReady(val)}
            confirmMessage="Tudo confirmado. Você pode avançar."
          />

          <StickyFooter>
            <NavButtons
              onPrev={handleQuizBack}
              prevLabel="Voltar"
              onNext={handleConfirmAndAdvance}
              nextLabel="Confirmar e avançar"
              nextDisabled={!quizReady}
            />
          </StickyFooter>
        </>
      )}
      <ProcessingOverlay
        show={processing}
        messages={["Salvando respostas...", "Concluído!"]}
        duration={1200}
        onComplete={() => {
          setProcessing(false)
          setCompleted(true)
        }}
      />
    </PageLayout>
  )
}
