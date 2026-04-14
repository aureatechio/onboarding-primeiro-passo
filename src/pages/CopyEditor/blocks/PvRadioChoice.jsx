import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Radio choice options with editable labels and optional badges.
 * Based on Etapa5 traffic section. Non-interactive (visual preview only).
 */
export default function PvRadioChoice({
  options,
  etapaId,
  onUpdate,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => {
        const isSelected = i === 0 // Preview shows first option as selected

        return (
          <div
            key={i}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: isSelected
                ? `2px solid ${opt.color || COLORS.accent}`
                : `1px solid ${COLORS.border}`,
              background: isSelected
                ? `${opt.color || COLORS.accent}15`
                : COLORS.card,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? (opt.color || COLORS.accent) : COLORS.textDim}`,
                  background: isSelected ? (opt.color || COLORS.accent) : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isSelected && <Icon name="check" size={11} color={COLORS.bg} />}
              </div>
              <div style={{ flex: 1 }}>
                <EditableText
                  value={opt.label}
                  originalValue={opt.originalLabel}
                  path={opt.labelPath}
                  etapaId={etapaId}
                  onUpdate={onUpdate}
                  as="p"
                  style={{
                    color: isSelected ? COLORS.text : COLORS.textMuted,
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 600,
                    margin: 0,
                  }}
                />
                {opt.badge && (
                  <EditableText
                    value={opt.badge}
                    originalValue={opt.originalBadge}
                    path={opt.badgePath}
                    etapaId={etapaId}
                    onUpdate={onUpdate}
                    as="span"
                    style={{
                      display: 'inline-block',
                      background: `${opt.color || COLORS.accent}20`,
                      color: opt.color || COLORS.accent,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 100,
                      letterSpacing: '0.05em',
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
