import { COLORS } from '../../../theme/colors'

/**
 * Preview block: Card with colored gradient background.
 * Used for prominent content (Etapa1 valueProps, Etapa2 pacote, Etapa62 bonificacao).
 */
export default function PvGradientCard({
  gradientFrom,
  gradientTo,
  borderColor,
  children,
  style: extraStyle = {},
}) {
  const from = gradientFrom || COLORS.card
  const to = gradientTo || COLORS.bg

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: `1px solid ${borderColor || COLORS.border}`,
        borderRadius: 14,
        padding: 22,
        marginBottom: 12,
        ...extraStyle,
      }}
    >
      {children}
    </div>
  )
}
