import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Card with icon + title + body text.
 * Replicates InfoCard pattern used across Etapa 3, 5, 6, etc.
 */
export default function PvInfoCard({
  icon,
  iconColor,
  title,
  originalTitle,
  titlePath,
  body,
  originalBody,
  bodyPath,
  etapaId,
  onUpdate,
  borderColor,
  bgTint,
  children,
}) {
  const accent = iconColor || COLORS.red

  return (
    <div
      style={{
        background: bgTint || COLORS.card,
        border: `1px solid ${borderColor || COLORS.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 12,
      }}
    >
      {(icon || title) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {icon && (
            <Icon
              name={icon}
              size={20}
              color={accent}
              bg={`${accent}15`}
              containerSize={40}
              radius={12}
            />
          )}
          {title && (
            <EditableText
              value={title}
              originalValue={originalTitle}
              path={titlePath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{
                color: COLORS.text,
                fontSize: 17,
                fontWeight: 800,
                lineHeight: 1.3,
                margin: 0,
              }}
            />
          )}
        </div>
      )}

      {body && (
        <EditableText
          value={body}
          originalValue={originalBody}
          path={bodyPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          multiline
          style={{
            color: COLORS.textMuted,
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
          }}
        />
      )}

      {children}
    </div>
  )
}
