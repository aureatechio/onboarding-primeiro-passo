/**
 * Paleta em hexadecimal (fonte única para JS). Espelhar em `global.css` (:root).
 * Em componentes, preferir `import { COLORS } from "./colors"` (alias de `colorHex`).
 */
export const colorHex = {
  bg: "#0A0A0A",
  card: "#141414",
  accent: "#C8FF00",
  magenta: "#FF00FF",
  red: "#E8356D",
  /** Início de gradientes CTA (vermelho Acelerai mais escuro) */
  redGradientStart: "#C42A56",
  /** Fim escuro de gradientes (ex.: botão hero) */
  redGradientEndDark: "#9E2645",
  text: "#F5F5F5",
  textMuted: "#AAAAAA",
  textDim: "#666666",
  border: "#222222",
  inputBg: "#111111",
  success: "#00E676",
  warning: "#FFD600",
  danger: "#FF4444",
  whatsapp: "#25D366",
};

/**
 * Tokens de design do app onboarding (dark + accent lima / magenta).
 * Variáveis CSS: {@link ./global.css} (:root).
 */
export const designTokens = {
  color: colorHex,

  /** Nomes alinhados às variáveis --color-* em global.css */
  cssVar: {
    bg: "--color-bg",
    card: "--color-card",
    accent: "--color-accent",
    magenta: "--color-magenta",
    red: "--color-red",
    text: "--color-text",
    textMuted: "--color-text-muted",
    textDim: "--color-text-dim",
    border: "--color-border",
    inputBg: "--color-input-bg",
    success: "--color-success",
    warning: "--color-warning",
    danger: "--color-danger",
    fontPrimary: "--font-primary",
    fontMono: "--font-mono",
  },

  fontFamily: {
    primary: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  /** Google Fonts carregados em global.css */
  fontGoogle: {
    interWeights: [300, 400, 500, 600, 700, 800, 900],
    jetBrainsMonoWeights: [400, 700],
  },

  layout: {
    contentMaxWidthPx: 520,
    page: { paddingX: 24, paddingTop: 28, paddingBottom: 40 },
    topBar: {
      paddingX: 24,
      paddingY: 12,
      zIndex: 10,
      backdropBlur: "blur(12px)",
      /** Sufixo hex de opacidade sobre colorHex.bg */
      backgroundAlphaSuffix: "EE",
    },
  },

  radius: {
    xs: 2,
    sm: 7,
    md: 10,
    lg: 12,
    xl: 14,
    xxl: 16,
    pill: 100,
    full: "50%",
  },

  space: {
    2: 6,
    3: 8,
    4: 10,
    5: 12,
    6: 14,
    7: 16,
    8: 18,
    9: 20,
    10: 22,
    11: 24,
    12: 28,
    14: 40,
    15: 48,
  },

  fontSize: {
    micro: 9,
    label: 10,
    caption: 11,
    small: 12,
    body: 13,
    bodyLg: 14,
    subtitle: 15,
    titleSm: 16,
    titleMd: 17,
    titleLg: 26,
    display: 34,
  },

  fontWeight: {
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    tight: 1.5,
    relaxed: 1.6,
    loose: 1.7,
  },

  letterSpacing: {
    wide: "0.08em",
    label: "0.1em",
    button: "0.01em",
  },

  motion: {
    transitionFast: "all 0.2s ease",
    transitionMedium: "all 0.3s ease",
    transitionSlow: "all 0.4s ease",
  },

  /** Pontos de cor em hex usados em gradientes de CTA (NavButtons, Etapa3) */
  gradient: {
    redCtaStart: colorHex.redGradientStart,
    warningCtaStart: "#B8960A",
  },

  /**
   * Sombras de CTA: combinar `elevation.cta` com cor + alpha em hex de 2 dígitos, ex.:
   * `` `${designTokens.elevation.cta} ${colorHex.red}25` ``
   */
  elevation: {
    cta: "0 4px 16px",
    ctaLg: "0 4px 20px",
  },

  scrollbar: {
    widthPx: 4,
    thumbRadiusPx: 2,
  },
};

/**
 * Tipografia semântica reaproveitando a fonte única de tokens.
 */
export const TYPE = {
  hero: {
    fontSize: 48,
    fontWeight: designTokens.fontWeight.black,
    letterSpacing: "-0.04em",
    lineHeight: 1.1,
  },
  h1: {
    fontSize: 28,
    fontWeight: designTokens.fontWeight.black,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: designTokens.fontWeight.extrabold,
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
  },
  h3: {
    fontSize: designTokens.fontSize.titleMd,
    fontWeight: designTokens.fontWeight.extrabold,
    lineHeight: 1.3,
  },
  body: {
    fontSize: designTokens.fontSize.bodyLg,
    fontWeight: 400,
    lineHeight: designTokens.lineHeight.loose,
  },
  bodySmall: {
    fontSize: designTokens.fontSize.body,
    fontWeight: 400,
    lineHeight: designTokens.lineHeight.relaxed,
  },
  caption: {
    fontSize: designTokens.fontSize.caption,
    fontWeight: designTokens.fontWeight.semibold,
    letterSpacing: designTokens.letterSpacing.wide,
    fontFamily: designTokens.fontFamily.mono,
  },
  label: {
    fontSize: designTokens.fontSize.label,
    fontWeight: designTokens.fontWeight.bold,
    letterSpacing: designTokens.letterSpacing.label,
    fontFamily: designTokens.fontFamily.mono,
  },
};

export default designTokens;
