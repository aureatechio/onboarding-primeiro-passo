import { useState, useCallback } from "react"
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
import BulletList from "../components/BulletList"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"

const TOTAL_SLIDES = 4

export default function Etapa2() {
  const { userData, goNext } = useOnboarding()
  const { ETAPA2 } = useCopy()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)
  const [quizReady, setQuizReady] = useState(false)
  const [processing, setProcessing] = useState(false)

  const celebName = userData.celebName

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

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="check"
        title={ETAPA2.completionTitle}
        description={ETAPA2.completionDescription}
      />
    )
  }

  // ── Slide contents ──
  const slideTag = `2.${currentSlide + 1}`

  const slideContents = [
    // ── Slide 2.1 ──
    <div key="slide-1">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        {ETAPA2.slide1.body}
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
          {ETAPA2.slide1.cardLabel}
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
              {ETAPA2.slide1.aceleraiLabel}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              {ETAPA2.slide1.aceleraiDesc}
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
              {ETAPA2.slide1.voceLabel}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              {ETAPA2.slide1.voceDesc}
            </p>
          </div>
        </div>
      </div>
    </div>,

    // ── Slide 2.2 ──
    <div key="slide-2">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        {ETAPA2.slide2.body}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {ETAPA2.slide2.steps.map((step) => (
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
        {ETAPA2.slide2.footer}
      </p>
    </div>,

    // ── Slide 2.3 ──
    <div key="slide-3">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        {ETAPA2.slide3.body}
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
          {ETAPA2.pacoteResumo}
        </p>
      </div>

      <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        {ETAPA2.slide3.footer}
      </p>
    </div>,

    // ── Slide 2.4 ──
    <div key="slide-4">
      <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, margin: "0 0 16px 0" }}>
        {ETAPA2.slide4.body}
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
            <span style={{ color: COLORS.red, fontSize: 14, fontWeight: 800 }}>{ETAPA2.slide4.nossaParte.label}</span>
          </div>
          <BulletList
            items={ETAPA2.slide4.nossaParte.items}
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
            <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 800 }}>{ETAPA2.slide4.suaParte.label}</span>
          </div>
          <BulletList
            items={ETAPA2.slide4.suaParte.items}
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
          {ETAPA2.slide4.closingTip}
        </p>
      </div>
    </div>,
  ]

  return (
    <PageLayout>
      <StepHeader title={ETAPA2.header.title} readTime={ETAPA2.header.readTime} />

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
            {ETAPA2.slideTitles[currentSlide]}
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
              nextLabel={currentSlide < TOTAL_SLIDES - 1 ? ETAPA2.navNextDefault : ETAPA2.navNextLast}
            />
          </StickyFooter>
        </>
      ) : (
        <>
          <QuizConfirmation
            questions={ETAPA2.quizQuestions}
            title={ETAPA2.quizTitle}
            subtitle={ETAPA2.quizSubtitle}
            icon="check"
            onAllConfirmed={(val) => setQuizReady(val)}
            confirmMessage={ETAPA2.quizConfirmMessage}
          />

          <StickyFooter>
            <NavButtons
              onPrev={handleQuizBack}
              prevLabel="Voltar"
              onNext={handleConfirmAndAdvance}
              nextLabel={ETAPA2.navConfirm}
              nextDisabled={!quizReady}
            />
          </StickyFooter>
        </>
      )}
      <ProcessingOverlay
        show={processing}
        messages={ETAPA2.processingMessages}
        duration={1200}
        onComplete={() => {
          setProcessing(false)
          setCompleted(true)
        }}
      />
    </PageLayout>
  )
}
