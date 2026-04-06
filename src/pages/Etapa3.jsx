import { useState } from "react";
import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import { ETAPA3 } from "../copy";
import { motion } from "framer-motion";
import PageLayout from "../components/PageLayout";
import StepHeader from "../components/StepHeader";
import SlideDots from "../components/SlideDots";
import SlideTransition from "../components/SlideTransition";
import NavButtons from "../components/NavButtons";
import QuizConfirmation from "../components/QuizConfirmation";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";
import BulletList from "../components/BulletList";
import StickyFooter from "../components/StickyFooter";
import ProcessingOverlay from "../components/ProcessingOverlay";

export default function Etapa3() {
  const { userData, goNext, totalSteps } = useOnboarding();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activated, setActivated] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);
  const [quizReady, setQuizReady] = useState(false);

  const totalSlides = 4;

  const goToSlide = (index) => {
    setSlideDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setSlideDirection(1);
      setCurrentSlide((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setShowQuiz(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevSlide = () => {
    if (showQuiz) {
      setShowQuiz(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentSlide > 0) {
      setSlideDirection(-1);
      setCurrentSlide((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Activation Screen ───────────────────────────────────────────────
  if (activated) {
    const container = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.15 },
      },
    };
    const item = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };


    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(ellipse at 50% 0%, #1a1500 0%, ${COLORS.bg} 70%)`,
        }}
      >
        <TopBar />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: "48px 24px 40px",
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <motion.div
            variants={item}
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: `${COLORS.warning}15`,
              border: `2px solid ${COLORS.warning}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: `0 0 40px ${COLORS.warning}15`,
            }}
          >
            <Icon name="clock" size={34} color={COLORS.warning} />
          </motion.div>

          {/* Title */}
          <motion.h2
            variants={item}
            style={{
              color: COLORS.text,
              fontSize: 26,
              fontWeight: 900,
              margin: "0 0 8px 0",
              letterSpacing: "-0.03em",
            }}
          >
            {ETAPA3.activation.title}
          </motion.h2>

          {/* Description */}
          <motion.p
            variants={item}
            style={{
              color: COLORS.textMuted,
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 20px 0",
            }}
          >
            {ETAPA3.activation.description(userData.celebName)}
          </motion.p>

          {/* Badge */}
          <motion.div
            variants={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${COLORS.warning}10`,
              border: `1px solid ${COLORS.warning}25`,
              borderRadius: 100,
              padding: "8px 18px",
              marginBottom: 28,
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.warning,
              }}
            />
            <span
              style={{
                color: COLORS.warning,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {ETAPA3.activation.badge}
            </span>
          </motion.div>

          {/* Card: O que acontece agora */}
          <motion.div
            variants={item}
            style={{
              background: COLORS.card,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              padding: 22,
              textAlign: "left",
              marginBottom: 28,
            }}
          >
            <p
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                margin: "0 0 16px 0",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {ETAPA3.activation.cardLabel}
            </p>
            {ETAPA3.activation.items.map((ni, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    i < ETAPA3.activation.items.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <Icon name={ni.icon} size={18} color={COLORS.text} />
                <div>
                  <p
                    style={{
                      color: COLORS.text,
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 2px 0",
                    }}
                  >
                    {ni.title}
                  </p>
                  <p
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 12,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {ni.desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Next step text */}
          <motion.p
            variants={item}
            style={{
              color: COLORS.textDim,
              fontSize: 13,
              margin: "0 0 24px 0",
              lineHeight: 1.5,
            }}
          >
            {ETAPA3.activation.nextStepText}
          </motion.p>

          {/* CTA Button */}
          <motion.button
            variants={item}
            whileHover={{ translateY: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={goNext}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${COLORS.redGradientStart}, ${COLORS.red})`,
              color: COLORS.text,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 4px 20px ${COLORS.red}25`,
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {ETAPA3.activation.ctaButton}
              <Icon name="arrowRight" size={16} color={COLORS.text} />
            </span>
          </motion.button>

          {/* Progress dots */}
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 20,
              marginBottom: 6,
            }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i <= 2 ? 24 : 8,
                  height: 4,
                  borderRadius: 2,
                  background: i <= 2 ? COLORS.success : COLORS.border,
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </motion.div>
          <motion.p
            variants={item}
            style={{
              color: COLORS.textDim,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {ETAPA3.activation.stepLabel(totalSteps)}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ─── Slide Content ───────────────────────────────────────────────────
  const renderSlide = () => {
    switch (currentSlide) {
      // ── Slide 3.1 ──────────────────────────────────────────────────
      case 0: {
        const timeline = ETAPA3.timeline;

        const statusColor = (s) => {
          if (s === "done") return COLORS.success;
          if (s === "current") return COLORS.red;
          if (s === "next") return COLORS.warning;
          return COLORS.border;
        };

        return (
          <div>
            <div
              style={{
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                padding: "20px 20px 12px",
              }}
            >
              {timeline.map((step, i) => {
                const color = statusColor(step.status);
                const isLast = i === timeline.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      position: "relative",
                      paddingBottom: isLast ? 0 : 8,
                      marginBottom: isLast ? 0 : 8,
                    }}
                  >
                    {/* Vertical line + circle */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        flexShrink: 0,
                        width: 18,
                      }}
                    >
                      <div
                        style={{
                          width: step.status === "current" ? 14 : 10,
                          height: step.status === "current" ? 14 : 10,
                          borderRadius: "50%",
                          background:
                            step.status === "future"
                              ? "transparent"
                              : color,
                          border:
                            step.status === "future"
                              ? `2px solid ${COLORS.border}`
                              : `2px solid ${color}`,
                          boxShadow:
                            step.status === "current"
                              ? `0 0 12px ${COLORS.red}60`
                              : "none",
                          position: "relative",
                          zIndex: 1,
                          marginTop: 3,
                        }}
                      />
                      {!isLast && (
                        <div
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 20,
                            background:
                              step.status === "done"
                                ? COLORS.success + "40"
                                : COLORS.border,
                          }}
                        />
                      )}
                    </div>

                    {/* Label + tag */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        paddingTop: 0,
                        minHeight: 28,
                      }}
                    >
                      <span
                        style={{
                          color:
                            step.status === "future"
                              ? COLORS.textDim
                              : step.status === "done"
                                ? COLORS.textMuted
                                : COLORS.text,
                          fontSize: 13,
                          fontWeight:
                            step.status === "current" ? 700 : 500,
                        }}
                      >
                        {step.label}
                      </span>
                      {step.tag && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: color,
                            background: `${color}15`,
                            border: `1px solid ${color}30`,
                            borderRadius: 100,
                            padding: "2px 8px",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {step.tag}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ── Slide 3.2 ──────────────────────────────────────────────────
      case 1: {
        const yourPart = ETAPA3.suaParte.items;
        const ourPart = ETAPA3.nossaParte.items;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Your part */}
            <div
              style={{
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.accent}25`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${COLORS.accent}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="target" size={18} color={COLORS.accent} />
                </div>
                <p
                  style={{
                    color: COLORS.accent,
                    fontSize: 14,
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  {ETAPA3.suaParte.label}
                </p>
              </div>
              <BulletList items={yourPart} color={COLORS.accent} />
            </div>

            {/* Our part */}
            <div
              style={{
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.red}25`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${COLORS.red}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="clapperboard" size={18} color={COLORS.red} />
                </div>
                <p
                  style={{
                    color: COLORS.red,
                    fontSize: 14,
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  {ETAPA3.nossaParte.label}
                </p>
              </div>
              <BulletList items={ourPart} color={COLORS.red} />
            </div>
          </div>
        );
      }

      // ── Slide 3.3 ──────────────────────────────────────────────────
      case 2: {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Warning box */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: `${COLORS.warning}10`,
                border: `1px solid ${COLORS.warning}25`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Icon name="alertTriangle" size={16} color={COLORS.warning} />
              <p
                style={{
                  color: COLORS.warning,
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {ETAPA3.warningText}
              </p>
            </div>

            {/* Scenario cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Agile client */}
              <div
                style={{
                  background: COLORS.card,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.success}25`,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${COLORS.success}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        color: COLORS.success,
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      <Icon name="check" size={14} color={COLORS.success} />
                    </span>
                  </div>
                  <span
                    style={{
                      color: COLORS.success,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {ETAPA3.clienteAgil.label}
                  </span>
                </div>
                <p
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {ETAPA3.clienteAgil.desc}
                </p>
              </div>

              {/* Slow client */}
              <div
                style={{
                  background: COLORS.card,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.danger}25`,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${COLORS.danger}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        color: COLORS.danger,
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      !
                    </span>
                  </div>
                  <span
                    style={{
                      color: COLORS.danger,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {ETAPA3.clienteDemorou.label}
                  </span>
                </div>
                <p
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {ETAPA3.clienteDemorou.desc}
                </p>
              </div>
            </div>

            {/* Accent closing box */}
            <div
              style={{
                background: `${COLORS.accent}08`,
                border: `1px solid ${COLORS.accent}20`,
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: COLORS.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {ETAPA3.agilidadeTip}
              </p>
            </div>
          </div>
        );
      }

      // ── Slide 3.4 ──────────────────────────────────────────────────
      case 3: {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* WhatsApp card */}
            <div
              style={{
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.whatsapp}25`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${COLORS.whatsapp}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="messageCircle" size={22} color={COLORS.whatsapp} />
                </div>
                <div>
                  <p
                    style={{
                      color: COLORS.text,
                      fontSize: 16,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {ETAPA3.whatsapp.title}
                  </p>
                  <p
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                      margin: "2px 0 0 0",
                    }}
                  >
                    {ETAPA3.whatsapp.subtitle}
                  </p>
                </div>
              </div>
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {ETAPA3.whatsapp.desc}
              </p>
            </div>

            {/* Plataforma Aceleraí card */}
            <div
              style={{
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.red}25`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${COLORS.red}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="monitor" size={22} color={COLORS.red} />
                </div>
                <div>
                  <p
                    style={{
                      color: COLORS.text,
                      fontSize: 16,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {ETAPA3.plataforma.title}
                  </p>
                  <p
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                      margin: "2px 0 0 0",
                    }}
                  >
                    {ETAPA3.plataforma.subtitle}
                  </p>
                </div>
              </div>
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {ETAPA3.plataforma.desc}
              </p>
            </div>

            {/* Warning tip */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: `${COLORS.warning}10`,
                border: `1px solid ${COLORS.warning}25`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Icon name="clock" size={14} color={COLORS.warning} />
              <p
                style={{
                  color: COLORS.warning,
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {ETAPA3.canaisTip}
              </p>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const slideTags = ETAPA3.slideTags;
  const slideTitles = ETAPA3.slideTitles;

  // ─── Main Screen ─────────────────────────────────────────────────────
  return (
    <PageLayout>
      <StepHeader
        title={ETAPA3.header.title}
        readTime={ETAPA3.header.readTime}
        alert={ETAPA3.header.alert}
      />

      {!showQuiz ? (
        <>
          <SlideDots
            total={totalSlides}
            current={currentSlide}
            onSelect={goToSlide}
          />

          {/* Slide tag */}
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
            {slideTags[currentSlide]}
          </p>

          {/* Slide title */}
          <h2
            style={{
              color: COLORS.text,
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 18px 0",
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
            {renderSlide()}
          </SlideTransition>

          <StickyFooter>
            <NavButtons
              onPrev={currentSlide > 0 ? prevSlide : undefined}
              onNext={nextSlide}
              nextLabel={
                currentSlide < totalSlides - 1
                  ? ETAPA3.navNextDefault
                  : ETAPA3.navNextLast
              }
            />
          </StickyFooter>
        </>
      ) : (
        <>
          <QuizConfirmation
            icon="clock"
            iconBg={`${COLORS.warning}10`}
            subtitle={ETAPA3.quizSubtitle}
            questions={ETAPA3.quizQuestions}
            onAllConfirmed={(ready) => setQuizReady(ready)}
            confirmMessage={ETAPA3.quizConfirmMessage}
          />

          <StickyFooter>
            <NavButtons
              onPrev={prevSlide}
              onNext={() => setProcessing(true)}
              nextVariant="warning"
              nextLabel={ETAPA3.navConfirmQuiz}
              nextDisabled={!quizReady}
            />
          </StickyFooter>
        </>
      )}

      <ProcessingOverlay
        show={processing}
        messages={ETAPA3.processingMessages}
        duration={2500}
        onComplete={() => {
          setProcessing(false);
          setActivated(true);
        }}
      />
    </PageLayout>
  );
}
