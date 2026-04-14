import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: CTA button representation (non-clickable, text is editable).
 */
export default function PvCtaButton({
  label,
  originalLabel,
  path,
  etapaId,
  onUpdate,
  icon = 'arrowRight',
  variant = 'red',
}) {
  const bgGradient =
    variant === 'red'
      ? `linear-gradient(135deg, ${COLORS.redGradientStart}, ${COLORS.red})`
      : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent}DD)`

  const textColor = variant === 'red' ? COLORS.text : COLORS.bg

  return (
    <div
      style={{
        width: '100%',
        padding: 16,
        borderRadius: 12,
        background: bgGradient,
        boxShadow: `0 4px 20px ${variant === 'red' ? COLORS.red : COLORS.accent}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        cursor: 'default',
      }}
    >
      <EditableText
        value={label}
        originalValue={originalLabel}
        path={path}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="span"
        style={{
          color: textColor,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: '0.01em',
        }}
      />
      {icon && <Icon name={icon} size={18} color={textColor} />}
    </div>
  )
}
