import { useState } from "react";
import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
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

export default function Etapa3() {
  const { userData, goNext, totalSteps } = useOnboarding();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activated, setActivated] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);
  const [quizReady, setQuizReady] = useState(false);

  const totalSlides = 4;

  const goToSlide = (index) => {
    setSlideDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setSlideDirection(1);
      setCurrentSlide((s) => s + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const prevSlide = () => {
    if (showQuiz) {
      setShowQuiz(false);
    } else if (currentSlide > 0) {
      setSlideDirection(-1);
      setCurrentSlide((s) => s - 1);
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

    const nowItems = [
      {
        icon: "mail",
        title: "Entraremos em contato",
        desc: "Nossa equipe vai te procurar nos canais combinados.",
      },
      {
        icon: "zap",
        title: "Responda rápido",
        desc: "Quanto mais rápido você responder, mais rápido sua campanha sai.",
      },
      {
        icon: "clapperboard",
        title: "A produção começa",
        desc: "Assim que tudo estiver alinhado, iniciamos as peças.",
      },
    ];

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
            Preparação ativada!
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
            A partir de agora, os 15 dias de preparação da sua campanha com{" "}
            <strong style={{ color: COLORS.text }}>{userData.celebName}</strong>{" "}
            começaram a contar. Fique atento aos prazos e responda rápido.
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
              15 DIAS DE PREPARAÇÃO
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
              O QUE ACONTECE AGORA
            </p>
            {nowItems.map((ni, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    i < nowItems.length - 1
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
            Na próxima etapa, você conhecerá as regras de uso da imagem da
            celebridade.
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
              Continuar para Etapa 4
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
            ETAPA 3 DE {totalSteps} CONCLUIDA
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
        const timeline = [
          { label: "Assinatura do contrato", status: "done" },
          { label: "Primeiro Passo", status: "current", tag: "AGORA" },
          { label: "Preparação (15 dias)", status: "next", tag: "EM BREVE" },
          { label: "Briefing criativo", status: "future" },
          { label: "Produção das peças", status: "future" },
          { label: "Aprovação do cliente", status: "future" },
          { label: "Gravação com celebridade", status: "future" },
          { label: "Entrega final", status: "future" },
          { label: "Uso da campanha", status: "future" },
        ];

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
        const yourPart = [
          "Responder ao briefing criativo",
          "Enviar materiais solicitados (logo, textos, referências)",
          "Aprovar ou solicitar ajustes nas peças",
          "Cumprir os prazos de cada fase",
        ];
        const ourPart = [
          "Criar o roteiro e direção criativa",
          "Produzir as peças com a celebridade",
          "Entregar dentro do prazo combinado",
        ];

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
                  A sua parte
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
                  A parte da Aceleraí
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
                O prazo do contrato começa a contar a partir da assinatura, não da entrega. Por isso, agilidade é tudo.
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
                    CLIENTE ÁGIL
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
                  Responde rápido, envia materiais no prazo, aprova sem demora. Resultado: campanha entregue dentro do previsto, com tempo de sobra para usar.
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
                    CLIENTE QUE DEMOROU
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
                  Demora pra responder, atrasa envio de materiais, pede muitas alterações fora do escopo. Resultado: prazo do contrato corre, e o tempo de uso da campanha diminui.
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
                Sua agilidade é o que garante o melhor resultado. O tempo é seu aliado — use-o bem.
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
                    WhatsApp
                  </p>
                  <p
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                      margin: "2px 0 0 0",
                    }}
                  >
                    Canal principal de comunicação
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
                Todas as atualizações, solicitações de materiais e aprovações serão enviadas por WhatsApp. Mantenha as notificações ativas e responda o mais rápido possível.
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
                    Plataforma Aceleraí
                  </p>
                  <p
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                      margin: "2px 0 0 0",
                    }}
                  >
                    Acompanhamento e entregas
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
                Pela plataforma você acompanha o status da campanha, faz upload de materiais e visualiza as entregas finais.
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
                Mantenha os dois canais ativos. Demora na resposta impacta diretamente o prazo da sua campanha.
              </p>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const slideTags = [
    "SLIDE 3.1",
    "SLIDE 3.2",
    "SLIDE 3.3",
    "SLIDE 3.4",
  ];
  const slideTitles = [
    "A linha do tempo da sua campanha",
    "Preparação: 15 dias pra tudo acontecer",
    "O tempo é seu aliado (se você for rápido)",
    "Onde a gente se fala",
  ];

  // ─── Main Screen ─────────────────────────────────────────────────────
  return (
    <PageLayout>
      <StepHeader
        title="Prazos e combinados"
        readTime="3 minutos"
        alert="Ao concluir esta etapa, os 15 dias de preparação começam a contar"
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
          >
            {renderSlide()}
          </SlideTransition>

          <div style={{ marginTop: 24 }}>
            <NavButtons
              onPrev={currentSlide > 0 ? prevSlide : undefined}
              onNext={nextSlide}
              nextLabel={
                currentSlide < totalSlides - 1
                  ? "Próximo"
                  : "Revisar e confirmar"
              }
            />
          </div>
        </>
      ) : (
        <>
          <QuizConfirmation
            icon="clock"
            iconBg={`${COLORS.warning}10`}
            subtitle="Ao confirmar, a preparação de 15 dias inicia"
            questions={[
              "Entendi que o prazo do contrato conta a partir da assinatura e que minha agilidade impacta diretamente o resultado.",
              "Sei que terei 15 dias de preparação e que preciso responder rapidamente a todas as solicitações.",
              "Compreendo que atrasos da minha parte podem reduzir o tempo de uso da campanha.",
            ]}
            onAllConfirmed={(ready) => setQuizReady(ready)}
            confirmMessage="Tudo certo! Você pode ativar a preparação."
          />

          <NavButtons
            onPrev={prevSlide}
            onNext={() => setActivated(true)}
            nextVariant="warning"
            nextLabel="Confirmar e ativar preparação"
            nextDisabled={!quizReady}
          />
        </>
      )}
    </PageLayout>
  );
}
