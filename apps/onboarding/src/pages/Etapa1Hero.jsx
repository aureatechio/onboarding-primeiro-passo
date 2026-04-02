import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import { motion, useScroll, useTransform } from "framer-motion";
import TopBarLogo from "../components/TopBarLogo";
import Icon from "../components/Icon";
import { TYPE } from "../theme/design-tokens";

export default function Etapa1Hero() {
  const { userData, goNext } = useOnboarding();
  const totalSteps = 7;
  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 300], [0, -80]);
  const glowScale = useTransform(scrollY, [0, 300], [1, 1.2]);
  const glowOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  const valueProps = [
    "Entender como funciona a sua campanha",
    "Conhecer os prazos e combinados",
    "Saber as regras de uso da celebridade",
    "Liberar a produção das suas peças",
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at 50% 0%, #1a0000 0%, ${COLORS.bg} 70%)`,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Noise overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
        }}
      />

      {/* Glow accent circle at top */}
      <motion.div
        style={{
          position: "absolute",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.red}22 0%, transparent 70%)`,
          pointerEvents: "none",
          y: glowY,
          scale: glowScale,
          opacity: glowOpacity,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "560px",
          width: "100%",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Logo marca (sem container pill) */}
          <motion.div
            variants={item}
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <TopBarLogo height={24} maxWidth={180} />
          </motion.div>

          {/* Greeting */}
          <motion.p
            variants={item}
            style={{
              fontSize: "14px",
              color: COLORS.textMuted,
              marginBottom: "8px",
              marginTop: 0,
            }}
          >
            Olá, {userData.clientName}. Bem-vindo.
          </motion.p>

          {/* Title */}
          <motion.h1
            variants={item}
            style={{
              ...TYPE.hero,
              color: COLORS.text,
              margin: "0 0 24px 0",
            }}
          >
            Primeiro Passo
          </motion.h1>

          {/* Red accent line */}
          <motion.div
            variants={item}
            style={{
              width: "64px",
              height: "3px",
              background: COLORS.red,
              borderRadius: "2px",
              margin: "0 auto 24px auto",
            }}
          />

          {/* Subheadline */}
          <motion.p
            variants={item}
            style={{
              fontSize: "15px",
              color: COLORS.textMuted,
              margin: "0 0 4px 0",
              lineHeight: 1.6,
            }}
          >
            Falta um passo entre você e a sua campanha com
          </motion.p>

          {/* Celebrity name */}
          <motion.p
            variants={item}
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: COLORS.text,
              margin: "0 0 36px 0",
            }}
          >
            {userData.celebName}
          </motion.p>

          {/* Value proposition card */}
          <motion.div
            variants={item}
            style={{
              width: "100%",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "16px",
              padding: "24px 28px",
              marginBottom: "28px",
              textAlign: "left",
            }}
          >
            {valueProps.map((text, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "10px 0",
                  borderBottom:
                    i < valueProps.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <Icon name="chevronRight" size={14} color={COLORS.red} />
                <span
                  style={{
                    fontSize: "14px",
                    color: COLORS.textMuted,
                    lineHeight: "22px",
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Time estimate */}
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "32px",
              justifyContent: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke={COLORS.textDim}
                strokeWidth="1.5"
              />
              <path
                d="M8 4V8L10.5 10.5"
                stroke={COLORS.textDim}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: "13px",
                color: COLORS.textDim,
              }}
            >
              Tempo estimado: 15 minutos
            </span>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            variants={item}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 0 30px ${COLORS.red}44`,
            }}
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "18px 32px",
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              color: "#FFFFFF",
              background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.redGradientEndDark})`,
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              marginBottom: "16px",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              COMEÇAR AGORA
              <Icon name="arrowRight" size={16} color={COLORS.text} />
            </span>
          </motion.button>

          {/* Micro-copy */}
          <motion.p
            variants={item}
            style={{
              fontSize: "12px",
              color: COLORS.textDim,
              margin: "0 0 40px 0",
              lineHeight: 1.6,
              maxWidth: "320px",
            }}
          >
            Ao completar, sua equipe de produção é ativada automaticamente.
          </motion.p>

          {/* Progress dots */}
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === 0 ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: i === 0 ? COLORS.red : COLORS.border,
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </motion.div>

          {/* Step label */}
          <motion.span
            variants={item}
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              color: COLORS.textDim,
            }}
          >
            ETAPA 1 DE 7
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}
