import { COLORS } from '../../../theme/colors'
import { TYPE } from '../../../theme/design-tokens'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'
import EditableList from '../EditableList'
import PvCtaButton from '../blocks/PvCtaButton'
import { PREVIEW_EXAMPLE_VALUES } from '../constants'

/**
 * Etapa 1 Preview — Hero / Boas-vindas.
 * Visual replica of Etapa1Hero.jsx for the copy editor.
 */
export default function Etapa1Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Step label pill */}
      {d.stepLabel && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: `${COLORS.red}15`,
            border: `1px solid ${COLORS.red}30`,
            borderRadius: 100,
            padding: '4px 12px',
            marginBottom: 24,
          }}
        >
          <EditableText
            value={d.stepLabel}
            originalValue={o.stepLabel}
            path={['stepLabel']}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="span"
            style={{
              color: COLORS.red,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>
      )}

      {/* Greeting */}
      <EditableText
        value={d.greeting}
        originalValue={o.greeting}
        path={['greeting']}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="p"
        style={{
          fontSize: 14,
          color: COLORS.textMuted,
          marginBottom: 8,
          marginTop: 0,
        }}
      />

      {/* Title */}
      <EditableText
        value={d.title}
        originalValue={o.title}
        path={['title']}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="h1"
        style={{
          ...TYPE.hero,
          color: COLORS.text,
          margin: '0 0 24px 0',
        }}
      />

      {/* Red accent line */}
      <div
        style={{
          width: 64,
          height: 3,
          background: COLORS.red,
          borderRadius: 2,
          margin: '0 auto 24px auto',
        }}
      />

      {/* Subtitle */}
      <EditableText
        value={d.subtitle}
        originalValue={o.subtitle}
        path={['subtitle']}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="p"
        style={{
          fontSize: 15,
          color: COLORS.textMuted,
          margin: '0 0 4px 0',
          lineHeight: 1.6,
        }}
      />

      {/* Celebrity name (example value) */}
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: COLORS.text,
          margin: '0 0 36px 0',
        }}
      >
        {PREVIEW_EXAMPLE_VALUES.celebName}
      </p>

      {/* Value proposition card */}
      <div
        style={{
          width: '100%',
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 28,
          textAlign: 'left',
        }}
      >
        <EditableList
          items={d.valueProps}
          originalItems={o.valueProps}
          basePath={['valueProps']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          renderPrefix={() => (
            <Icon name="chevronRight" size={14} color={COLORS.red} />
          )}
          itemAs="span"
          itemStyle={{
            fontSize: 14,
            color: COLORS.textMuted,
            lineHeight: '22px',
          }}
        />
      </div>

      {/* Time estimate */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 32,
          justifyContent: 'center',
        }}
      >
        <Icon name="clock" size={16} color={COLORS.textDim} />
        <EditableText
          value={d.estimatedTime}
          originalValue={o.estimatedTime}
          path={['estimatedTime']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="span"
          style={{
            fontSize: 13,
            color: COLORS.textDim,
          }}
        />
      </div>

      {/* CTA Button */}
      <PvCtaButton
        label={d.ctaButton}
        originalLabel={o.ctaButton}
        path={['ctaButton']}
        etapaId={etapaId}
        onUpdate={onUpdate}
      />

      {/* Micro-copy */}
      <EditableText
        value={d.microCopy}
        originalValue={o.microCopy}
        path={['microCopy']}
        etapaId={etapaId}
        onUpdate={onUpdate}
        as="p"
        style={{
          fontSize: 12,
          color: COLORS.textDim,
          margin: '0 0 40px 0',
          lineHeight: 1.6,
          maxWidth: 320,
        }}
      />

      {/* Progress dots (visual only) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === 0 ? 24 : 8,
              height: 8,
              borderRadius: 999,
              background: i === 0 ? COLORS.red : COLORS.border,
            }}
          />
        ))}
      </div>
    </div>
  )
}
