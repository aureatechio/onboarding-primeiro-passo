import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Warning/danger alert card with icon and editable text.
 */
export default function PvAlertBox({
  text,
  originalText,
  path,
  etapaId,
  onUpdate,
  variant = 'warning',
  icon = 'clock',
}) {
  const color =
    variant === 'danger' ? COLORS.danger
      : variant === 'success' ? COLORS.success
        : COLORS.warning

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Icon name={icon} size={14} color={color} />
      <EditableText
        value={text}
        originalValue={originalText}
        path={path}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="p"
        multiline
        style={{
          color: color,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
          margin: 0,
        }}
      />
    </div>
  )
}
