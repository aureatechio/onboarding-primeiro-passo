import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Two-column card with icon <-> arrow <-> icon.
 * Used in "PENSE ASSIM" pattern (Etapa2 slide1, Etapa5).
 */
export default function PvTwoColumnCard({
  label,
  originalLabel,
  labelPath,
  leftIcon,
  leftColor,
  leftLabel,
  originalLeftLabel,
  leftLabelPath,
  leftDesc,
  originalLeftDesc,
  leftDescPath,
  rightIcon,
  rightColor,
  rightLabel,
  originalRightLabel,
  rightLabelPath,
  rightDesc,
  originalRightDesc,
  rightDescPath,
  etapaId,
  onUpdate,
  children,
}) {
  const lColor = leftColor || COLORS.magenta
  const rColor = rightColor || COLORS.accent

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 12,
      }}
    >
      {label && (
        <EditableText
          value={label}
          originalValue={originalLabel}
          path={labelPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          style={{
            color: COLORS.textDim,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            margin: '0 0 16px 0',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Left column */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${lColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}
          >
            <Icon name={leftIcon} size={22} color={lColor} />
          </div>
          {leftLabel && (
            <EditableText
              value={leftLabel}
              originalValue={originalLeftLabel}
              path={leftLabelPath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{
                color: lColor,
                fontSize: 11,
                fontWeight: 800,
                margin: '0 0 2px 0',
                letterSpacing: '0.05em',
              }}
            />
          )}
          {leftDesc && (
            <EditableText
              value={leftDesc}
              originalValue={originalLeftDesc}
              path={leftDescPath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}
            />
          )}
        </div>

        <Icon name="arrowRight" size={20} color={COLORS.textDim} />

        {/* Right column */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${rColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}
          >
            <Icon name={rightIcon} size={22} color={rColor} />
          </div>
          {rightLabel && (
            <EditableText
              value={rightLabel}
              originalValue={originalRightLabel}
              path={rightLabelPath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{
                color: rColor,
                fontSize: 11,
                fontWeight: 800,
                margin: '0 0 2px 0',
                letterSpacing: '0.05em',
              }}
            />
          )}
          {rightDesc && (
            <EditableText
              value={rightDesc}
              originalValue={originalRightDesc}
              path={rightDescPath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
