import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import PvSummaryCard from '../blocks/PvSummaryCard'
import PvNumberedSteps from '../blocks/PvNumberedSteps'
import PvCtaButton from '../blocks/PvCtaButton'
import PvCompletionBlock from '../blocks/PvCompletionBlock'
import Icon from '../../../components/Icon'
import { PREVIEW_EXAMPLE_VALUES } from '../constants'

export default function EtapaFinalPreview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  // nextSteps is a function — render with example values
  const nextStepsData = typeof d.nextSteps === 'function'
    ? d.nextSteps(PREVIEW_EXAMPLE_VALUES.atendente, 'f')
    : d.nextSteps || []
  const nextStepsOrig = typeof o.nextSteps === 'function'
    ? o.nextSteps(PREVIEW_EXAMPLE_VALUES.atendente, 'f')
    : o.nextSteps || []

  // atendenteLabel is a function
  const atendenteLabel = typeof d.atendenteLabel === 'function'
    ? d.atendenteLabel('f') : d.atendenteLabel || ''

  // Summary rows
  const summaryRows = [
    { icon: 'star', label: 'Celebridade', value: PREVIEW_EXAMPLE_VALUES.celebName },
    { icon: 'mapPin', label: 'Praça', value: PREVIEW_EXAMPLE_VALUES.praca },
    { icon: 'tag', label: 'Segmento', value: PREVIEW_EXAMPLE_VALUES.segmento },
    {
      icon: 'clapperboard', label: 'Pacote',
      value: d.resumo?.pacoteValue || '',
      originalValue: o.resumo?.pacoteValue,
      valuePath: ['resumo', 'pacoteValue'],
    },
    { icon: 'calendarDays', label: 'Vigência', value: '12 meses' },
    {
      icon: 'clock', label: 'Preparação',
      value: d.resumo?.preparacaoValue || '',
      originalValue: o.resumo?.preparacaoValue,
      valuePath: ['resumo', 'preparacaoValue'],
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `${COLORS.accent}12`, border: `2px solid ${COLORS.accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Icon name="circleCheck" size={24} color={COLORS.accent} />
        </div>
        <EditableText
          value={d.resumo?.title} originalValue={o.resumo?.title}
          path={['resumo', 'title']} etapaId={etapaId} onUpdate={onUpdate}
          as="h1" style={{ color: COLORS.text, fontSize: 24, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.03em', textAlign: 'center' }}
        />
        <EditableText
          value={d.resumo?.subtitle} originalValue={o.resumo?.subtitle}
          path={['resumo', 'subtitle']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, textAlign: 'center' }}
        />
      </div>

      {/* Summary Card */}
      <PvSummaryCard
        cardLabel={d.resumo?.cardLabel} originalCardLabel={o.resumo?.cardLabel} cardLabelPath={['resumo', 'cardLabel']}
        rows={summaryRows} etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* Próximos Passos */}
      <EditableText
        value={d.proximosPassosLabel} originalValue={o.proximosPassosLabel}
        path={['proximosPassosLabel']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" style={{
          color: COLORS.textDim, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em', margin: '24px 0 12px 0',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      />

      <PvNumberedSteps
        items={nextStepsData} originalItems={nextStepsOrig}
        basePath={['nextSteps']} etapaId={etapaId} onUpdate={onUpdate}
        badgeColor={COLORS.red}
      />

      {/* Atendente card */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.red}18, ${COLORS.red}08)`,
        border: `1px solid ${COLORS.red}30`,
        borderRadius: 14, padding: 20, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${COLORS.red}20`, border: `2px solid ${COLORS.red}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="hand" size={22} color={COLORS.red} />
        </div>
        <div>
          <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 4px 0', fontFamily: "'JetBrains Mono', monospace" }}>
            {atendenteLabel}
          </p>
          <p style={{ color: COLORS.text, fontSize: 16, fontWeight: 800, margin: '0 0 2px 0' }}>
            {PREVIEW_EXAMPLE_VALUES.atendente}
          </p>
          <EditableText
            value={d.atendenteContactTime} originalValue={o.atendenteContactTime}
            path={['atendenteContactTime']} etapaId={etapaId} onUpdate={onUpdate}
            as="p" style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}
          />
        </div>
      </div>

      {/* CTA */}
      <PvCtaButton
        label={d.ctaButton} originalLabel={o.ctaButton}
        path={['ctaButton']} etapaId={etapaId} onUpdate={onUpdate}
      />
      <EditableText
        value={d.ctaMicro} originalValue={o.ctaMicro}
        path={['ctaMicro']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" style={{ color: COLORS.textDim, fontSize: 12, textAlign: 'center', margin: '0 0 32px 0' }}
      />

      {/* Parabéns */}
      <PvCompletionBlock
        icon="partyPopper"
        title={d.parabens?.title} originalTitle={o.parabens?.title} titlePath={['parabens', 'title']}
        description={d.parabens?.body} originalDescription={o.parabens?.body} descriptionPath={['parabens', 'body']}
        badge={d.parabens?.badge} originalBadge={o.parabens?.badge} badgePath={['parabens', 'badge']}
        badgeColor={COLORS.success} etapaId={etapaId} onUpdate={onUpdate}
      >
        <EditableText
          value={d.parabens?.cta} originalValue={o.parabens?.cta}
          path={['parabens', 'cta']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700, textAlign: 'center', margin: '12px 0' }}
        />
        <EditableText
          value={d.parabens?.closing} originalValue={o.parabens?.closing}
          path={['parabens', 'closing']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.textDim, fontSize: 13, textAlign: 'center', margin: 0 }}
        />
      </PvCompletionBlock>
    </div>
  )
}
