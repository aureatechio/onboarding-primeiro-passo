import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { useCopy } from "../context/CopyContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import SlideDots from "../components/SlideDots"
import SlideTransition from "../components/SlideTransition"
import NavButtons from "../components/NavButtons"
import QuizConfirmation from "../components/QuizConfirmation"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"

export default function Etapa4() {
  const { userData, goNext } = useOnboarding()
  const { ETAPA4 } = useCopy()
  const { celebName, praca, segmento } = userData

  const [currentSlide, setCurrentSlide] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)
  const [quizReady, setQuizReady] = useState(false)
  const [processing, setProcessing] = useState(false)

  const totalSlides = 4

  const goToSlide = (index) => {
    setSlideDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
    setShowQuiz(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const nextSlide = () => {
    if (showQuiz) {
      if (quizReady) setProcessing(true)
      return
    }
    if (currentSlide < totalSlides - 1) {
      setSlideDirection(1)
      setCurrentSlide((s) => s + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setShowQuiz(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const prevSlide = () => {
    if (showQuiz) {
      setShowQuiz(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (currentSlide > 0) {
      setSlideDirection(-1)
      setCurrentSlide((s) => s - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // ─── Completion ─────────────────────────────────────────────
  if (completed) {
    return (
      <CompletionScreen
        icon="star"
        title={ETAPA4.completionTitle}
        description={ETAPA4.completionDescription.replace('${celebName}', celebName)}
        summaryItems={ETAPA4.completionSummary(celebName, praca, segmento)}
      />
    )
  }

  // ─── Slides ─────────────────────────────────────────────────
  const slideHeaders = ETAPA4.slideHeaders

  const currentHeader = showQuiz ? slideHeaders[4] : slideHeaders[currentSlide]

  // ─── Reusable card style ────────────────────────────────────
  const cardStyle = {
    background: COLORS.card,
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    padding: 20,
    marginBottom: 16,
  }

  const labelStyle = {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "0 0 8px 0",
    fontFamily: "'JetBrains Mono', monospace",
  }

  const bodyText = {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
  }

  // ─── Slide 4.1 ─────────────────────────────────────────────
  const renderSlide41 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 16 }}>
        {ETAPA4.slide1.body.replace('${celebName}', celebName)}
      </p>

      {/* Contract card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.card}, #1a1a1a)`,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <p style={labelStyle}>{ETAPA4.slide1.contractLabel}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>CELEBRIDADE</p>
            <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
              {celebName}
            </p>
          </div>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>PRACA</p>
            <p style={{ color: COLORS.accent, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {praca}
            </p>
          </div>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>SEGMENTO</p>
            <p style={{ color: COLORS.warning, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {segmento}
            </p>
          </div>
        </div>
      </div>

      {/* Exclusivity box */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.accent}30`,
          background: `${COLORS.accent}08`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Icon name="lock" size={18} color={COLORS.accent} />
          <p style={{ color: COLORS.accent, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide1.exclusivityTitle}
          </p>
        </div>
        <p style={bodyText}>
          {ETAPA4.slide1.exclusivityBody.replace('${celebName}', celebName)}
        </p>
      </div>

      {/* Practical example */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Icon name="mapPin" size={18} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide1.exampleTitle}
          </p>
        </div>
        <p style={bodyText}>
          {ETAPA4.slide1.exampleBody.replace('${celebName}', celebName).replace('${praca}', praca).replace('${segmento}', segmento)}
        </p>
      </div>
    </div>
  )

  // ─── Slide 4.3 ─────────────────────────────────────────────
  const renderSlide43 = () => {
    const stepColors = [COLORS.red, COLORS.accent, COLORS.warning, COLORS.success]
    const steps = ETAPA4.slide2.steps.map((s, i) => ({ ...s, color: stepColors[i] }))

    return (
      <div>
        <p style={{ ...bodyText, marginBottom: 20 }}>
          {ETAPA4.slide2.body}
        </p>

        {/* Timeline */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <p style={labelStyle}>{ETAPA4.slide2.flowLabel}</p>
          <div style={{ position: "relative", paddingLeft: 32 }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 8,
                bottom: 8,
                width: 2,
                background: COLORS.border,
              }}
            />
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  paddingBottom: i < steps.length - 1 ? 24 : 0,
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -32 + 3,
                    top: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `${step.color}20`,
                    border: `2px solid ${step.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <Icon name={step.icon} size={9} color={step.color} />
                </div>
                <div>
                  <p
                    style={{
                      color: step.color,
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 2px 0",
                    }}
                  >
                    {i + 1}. {step.label}
                  </p>
                  <p style={{ ...bodyText, fontSize: 13 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2 rodadas box */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.accent}30`,
            background: `${COLORS.accent}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="penLine" size={16} color={COLORS.accent} />
            <p style={{ color: COLORS.accent, fontSize: 14, fontWeight: 800, margin: 0 }}>
              {ETAPA4.slide2.ajustesTitle}
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13 }}>
            {ETAPA4.slide2.ajustesBody}
          </p>
        </div>

        {/* Celebridade pode pedir ajustes */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.warning}30`,
            background: `${COLORS.warning}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="alertTriangle" size={16} color={COLORS.warning} />
            <p style={{ color: COLORS.warning, fontSize: 14, fontWeight: 800, margin: 0 }}>
              {ETAPA4.slide2.celebAjustesTitle}
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13 }}>
            {ETAPA4.slide2.celebAjustesBody}
          </p>
        </div>

        {/* Regra de ouro */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.red}30`,
            background: `${COLORS.red}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="gem" size={16} color={COLORS.red} />
            <p style={{ color: COLORS.red, fontSize: 14, fontWeight: 800, margin: 0 }}>
              {ETAPA4.slide2.regraOuroTitle}
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13, marginTop: 8 }}>
            {ETAPA4.slide2.regraOuroBody}
          </p>
        </div>
      </div>
    )
  }

  // ─── Slide 4.4 ─────────────────────────────────────────────
  const renderSlide44 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        {ETAPA4.slide3.body}
      </p>

      {/* Franquias */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="building2" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide3.franquias.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="circleCheck" size={16} color={COLORS.success} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              {ETAPA4.slide3.franquias.allowed}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              {ETAPA4.slide3.franquias.forbidden}
            </p>
          </div>
        </div>
      </div>

      {/* Canais digitais */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="smartphone" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide3.canaisDigitais.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="circleCheck" size={16} color={COLORS.success} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              {ETAPA4.slide3.canaisDigitais.allowed}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              {ETAPA4.slide3.canaisDigitais.forbidden}
            </p>
          </div>
        </div>
      </div>

      {/* Regras de marcacao e veiculacao */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="ban" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide3.regrasPublicacao.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              {ETAPA4.slide3.regrasPublicacao.noTag}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="alertTriangle" size={16} color={COLORS.warning} />
            <p style={{ ...bodyText, fontSize: 13, whiteSpace: "pre-line" }}>
              {ETAPA4.slide3.regrasPublicacao.canaisOficiais}
            </p>
          </div>
        </div>
      </div>

      {/* TV / Outdoor */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="tv" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide3.tvRadioOutdoor.title}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <Icon name="alertTriangle" size={16} color={COLORS.warning} />
          <p style={{ ...bodyText, fontSize: 13 }}>
            {ETAPA4.slide3.tvRadioOutdoor.warning}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ETAPA4.slide3.tvRadioOutdoor.tags.map(
            (tag) => (
              <span
                key={tag}
                style={{
                  background: `${COLORS.warning}12`,
                  border: `1px solid ${COLORS.warning}25`,
                  borderRadius: 100,
                  padding: "4px 12px",
                  color: COLORS.warning,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )

  // ─── Slide 4.5 ─────────────────────────────────────────────
  const renderSlide45 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        {ETAPA4.slide4.body}
      </p>

      {/* Renovacao */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="refreshCw" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide4.renovacao.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ETAPA4.slide4.renovacao.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                background: COLORS.accent,
                color: COLORS.bg,
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <p style={{ ...bodyText, fontSize: 13 }}>
              {step}
            </p>
          </div>
          ))}
        </div>
      </div>

      {/* Celebridade nao disponivel */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="shuffle" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide4.naoDisponivel.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: `${COLORS.accent}08`,
              border: `1px solid ${COLORS.accent}20`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
              {ETAPA4.slide4.naoDisponivel.opcaoA.title}
            </p>
            <p style={{ ...bodyText, fontSize: 12 }}>
              {ETAPA4.slide4.naoDisponivel.opcaoA.desc}
            </p>
          </div>
          <div
            style={{
              background: `${COLORS.warning}08`,
              border: `1px solid ${COLORS.warning}20`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p style={{ color: COLORS.warning, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
              {ETAPA4.slide4.naoDisponivel.opcaoB.title}
            </p>
            <p style={{ ...bodyText, fontSize: 12 }}>
              {ETAPA4.slide4.naoDisponivel.opcaoB.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Encerramento */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.danger}30`,
          background: `${COLORS.danger}08`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="alertTriangle" size={20} color={COLORS.danger} />
          <p style={{ color: COLORS.danger, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {ETAPA4.slide4.encerramento.title}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ETAPA4.slide4.encerramento.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: COLORS.danger, fontSize: 14, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <p style={{ ...bodyText, fontSize: 13 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Multa */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.danger}40`,
          background: `${COLORS.danger}10`,
          textAlign: "center",
        }}
      >
        <Icon name="scale" size={22} color={COLORS.danger} />
        <p
          style={{
            color: COLORS.danger,
            fontSize: 16,
            fontWeight: 900,
            margin: "8px 0 4px 0",
          }}
        >
          {ETAPA4.slide4.multa.title}
        </p>
        <p style={{ ...bodyText, fontSize: 12, textAlign: "center" }}>
          {ETAPA4.slide4.multa.desc}
        </p>
      </div>
    </div>
  )

  // ─── Quiz 4.6 ───────────────────────────────────────────────
  const renderQuiz = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        {ETAPA4.quizIntro.replace('${celebName}', celebName)}
      </p>
      <QuizConfirmation
        questions={ETAPA4.quizQuestions.map((q) =>
          q.replace('${celebName}', celebName).replace('${praca}', praca).replace('${segmento}', segmento)
        )}
        icon="star"
        title={ETAPA4.quizTitle}
        subtitle={ETAPA4.quizSubtitle}
        iconBg={`${COLORS.warning}15`}
        onAllConfirmed={(ready) => setQuizReady(ready)}
        confirmMessage={ETAPA4.quizConfirmMessage}
      />
    </div>
  )

  // ─── Slide renderer ────────────────────────────────────────
  const slides = [renderSlide41, renderSlide43, renderSlide44, renderSlide45]

  const renderCurrentContent = () => {
    if (showQuiz) return renderQuiz()
    return slides[currentSlide]()
  }

  return (
    <PageLayout>
      <StepHeader
        tag={currentHeader.tag}
        title={currentHeader.title}
        readTime={currentHeader.readTime}
      />

      <SlideDots
        total={totalSlides}
        current={showQuiz ? totalSlides : currentSlide}
        onSelect={(i) => {
          if (i < totalSlides) goToSlide(i)
        }}
      />

      <SlideTransition
        slideKey={showQuiz ? "quiz" : `slide-${currentSlide}`}
        direction={slideDirection}
        onSwipeLeft={showQuiz ? undefined : nextSlide}
        onSwipeRight={currentSlide > 0 || showQuiz ? prevSlide : undefined}
      >
        {renderCurrentContent()}
      </SlideTransition>

      <StickyFooter>
        <NavButtons
          onPrev={currentSlide > 0 || showQuiz ? prevSlide : undefined}
          onNext={nextSlide}
          nextLabel={
            showQuiz
              ? quizReady
                ? ETAPA4.navConcluir
                : ETAPA4.navConfirmAll
              : currentSlide === totalSlides - 1
                ? ETAPA4.navGoToQuiz
                : ETAPA4.navNextSlide
          }
          nextDisabled={showQuiz && !quizReady}
          nextVariant={showQuiz && quizReady ? "warning" : "red"}
        />
      </StickyFooter>
      <ProcessingOverlay
        show={processing}
        messages={ETAPA4.processingMessages}
        duration={1200}
        onComplete={() => {
          setProcessing(false)
          setCompleted(true)
        }}
      />
    </PageLayout>
  )
}
