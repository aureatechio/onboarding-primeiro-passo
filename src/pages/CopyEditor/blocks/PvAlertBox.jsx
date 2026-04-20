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
  title,
  originalTitle,
  titlePath,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {title && (
          <EditableText
            value={title}
            originalValue={originalTitle}
            path={titlePath}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="p"
            style={{
              color: color,
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.4,
              margin: 0,
            }}
          />
        )}
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
    </div>
  )
}
