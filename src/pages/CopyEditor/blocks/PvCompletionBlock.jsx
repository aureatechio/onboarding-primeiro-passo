import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Completion/success screen with icon, title, description, badge.
 * Replicates CompletionScreen.jsx visual without OnboardingContext.
 */
export default function PvCompletionBlock({
  icon = 'check',
  title,
  originalTitle,
  titlePath,
  description,
  originalDescription,
  descriptionPath,
  badge,
  originalBadge,
  badgePath,
  badgeColor,
  cardLabel,
  originalCardLabel,
  cardLabelPath,
  nextStepText,
  originalNextStepText,
  nextStepTextPath,
  ctaButton,
  originalCtaButton,
  ctaButtonPath,
  etapaId,
  onUpdate,
  children,
}) {
  return (
    <div
      style={{
        background: `radial-gradient(ellipse at 50% 0%, #001a00 0%, ${COLORS.bg} 70%)`,
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        marginTop: 24,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: `${COLORS.success}12`,
          border: `2px solid ${COLORS.success}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Icon name={icon} size={28} color={COLORS.success} />
      </div>

      {title && (
        <EditableText
          value={title}
          originalValue={originalTitle}
          path={titlePath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="h2"
          style={{
            color: COLORS.text,
            fontSize: 26,
            fontWeight: 900,
            margin: '0 0 8px 0',
            letterSpacing: '-0.03em',
            textAlign: 'center',
          }}
        />
      )}

      {description && (
        <EditableText
          value={description}
          originalValue={originalDescription}
          path={descriptionPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          multiline
          style={{
            color: COLORS.textMuted,
            fontSize: 15,
            lineHeight: 1.6,
            margin: '0 0 20px 0',
            textAlign: 'center',
          }}
        />
      )}

      {badge && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: `${badgeColor || COLORS.accent}10`,
            border: `1px solid ${badgeColor || COLORS.accent}25`,
            borderRadius: 100,
            padding: '8px 18px',
            marginBottom: 16,
          }}
        >
          <EditableText
            value={badge}
            originalValue={originalBadge}
            path={badgePath}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="span"
            style={{
              color: badgeColor || COLORS.accent,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        </div>
      )}

      {cardLabel && (
        <EditableText
          value={cardLabel}
          originalValue={originalCardLabel}
          path={cardLabelPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          style={{
            color: COLORS.textDim,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '20px 0 12px',
          }}
        />
      )}

      {children}

      {nextStepText && (
        <EditableText
          value={nextStepText}
          originalValue={originalNextStepText}
          path={nextStepTextPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          multiline
          style={{
            color: COLORS.textMuted,
            fontSize: 13,
            lineHeight: 1.6,
            margin: '20px 0 16px',
            textAlign: 'center',
          }}
        />
      )}

      {ctaButton && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: badgeColor || COLORS.accent,
            color: '#fff',
            borderRadius: 100,
            padding: '10px 22px',
            marginTop: 8,
          }}
        >
          <EditableText
            value={ctaButton}
            originalValue={originalCtaButton}
            path={ctaButtonPath}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="span"
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          />
        </div>
      )}
    </div>
  )
}
