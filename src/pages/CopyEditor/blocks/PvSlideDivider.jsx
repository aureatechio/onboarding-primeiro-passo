import { COLORS } from '../../../theme/colors'

/**
 * Preview block: Visual divider between slides within an etapa.
 * Shows "SLIDE 2.1" style marker. Read-only (no editing).
 */
export default function PvSlideDivider({ tag }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '28px 0 16px',
      }}
    >
      <div
        style={{
          height: 1,
          flex: 1,
          background: `${COLORS.border}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
          color: COLORS.textDim,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        SLIDE {tag}
      </span>
      <div
        style={{
          height: 1,
          flex: 1,
          background: `${COLORS.border}`,
        }}
      />
    </div>
  )
}
