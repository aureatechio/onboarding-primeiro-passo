import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import PvStepHeader from '../blocks/PvStepHeader'
import PvInfoCard from '../blocks/PvInfoCard'
import PvTwoColumnCard from '../blocks/PvTwoColumnCard'
import PvAlertBox from '../blocks/PvAlertBox'
import PvRadioChoice from '../blocks/PvRadioChoice'
import PvCompletionBlock from '../blocks/PvCompletionBlock'
import Icon from '../../../components/Icon'

/**
 * Etapa 5 Preview — Presença digital.
 * Visual replica of Etapa5.jsx for the copy editor.
 */
export default function Etapa5Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div>
      {/* Header */}
      <PvStepHeader
        data={d.header}
        originalData={o.header}
        etapaId={etapaId}
        basePath={['header']}
        onUpdate={onUpdate}
        stepNum={5}
        showPersonalized
      />

      {/* Card 1 - Palco */}
      <PvInfoCard
        icon="smartphone"
        iconColor={COLORS.red}
        title={d.palco?.title}
        originalTitle={o.palco?.title}
        titlePath={['palco', 'title']}
        body={d.palco?.body}
        originalBody={o.palco?.body}
        bodyPath={['palco', 'body']}
        etapaId={etapaId}
        onUpdate={onUpdate}
        borderColor={`${COLORS.red}25`}
        bgTint={`linear-gradient(135deg, ${COLORS.red}18, ${COLORS.red}08)`}
      />

      {/* Card 2 - Pense Assim */}
      <PvTwoColumnCard
        label={d.penseAssim?.label}
        originalLabel={o.penseAssim?.label}
        labelPath={['penseAssim', 'label']}
        leftIcon="star"
        leftColor={COLORS.magenta}
        leftLabel={d.penseAssim?.celebLabel}
        originalLeftLabel={o.penseAssim?.celebLabel}
        leftLabelPath={['penseAssim', 'celebLabel']}
        leftDesc={d.penseAssim?.celebDesc}
        originalLeftDesc={o.penseAssim?.celebDesc}
        leftDescPath={['penseAssim', 'celebDesc']}
        rightIcon="smartphone"
        rightColor={COLORS.accent}
        rightLabel={d.penseAssim?.canaisLabel}
        originalRightLabel={o.penseAssim?.canaisLabel}
        rightLabelPath={['penseAssim', 'canaisLabel']}
        rightDesc={d.penseAssim?.canaisDesc}
        originalRightDesc={o.penseAssim?.canaisDesc}
        rightDescPath={['penseAssim', 'canaisDesc']}
        etapaId={etapaId}
        onUpdate={onUpdate}
      >
        {d.penseAssim?.warningTip && (
          <PvAlertBox
            text={d.penseAssim.warningTip}
            originalText={o.penseAssim?.warningTip}
            path={['penseAssim', 'warningTip']}
            etapaId={etapaId}
            onUpdate={onUpdate}
            variant="warning"
          />
        )}
      </PvTwoColumnCard>

      {/* Card 3 - Traffic section */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon name="trendingUp" size={20} color={COLORS.accent} />
          <EditableText
            value={d.trafego?.title}
            originalValue={o.trafego?.title}
            path={['trafego', 'title']}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="h3"
            style={{ color: COLORS.accent, fontSize: 16, fontWeight: 800, margin: 0 }}
          />
        </div>

        <EditableText
          value={d.trafego?.body}
          originalValue={o.trafego?.body}
          path={['trafego', 'body']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          multiline
          style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
        />

        <EditableText
          value={d.trafego?.question}
          originalValue={o.trafego?.question}
          path={['trafego', 'question']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, margin: '0 0 12px 0' }}
        />

        <PvRadioChoice
          etapaId={etapaId}
          onUpdate={onUpdate}
          options={[
            {
              label: d.trafego?.optionYes,
              originalLabel: o.trafego?.optionYes,
              labelPath: ['trafego', 'optionYes'],
              badge: d.trafego?.optionYesBadge,
              originalBadge: o.trafego?.optionYesBadge,
              badgePath: ['trafego', 'optionYesBadge'],
              color: COLORS.accent,
            },
            {
              label: d.trafego?.optionNo,
              originalLabel: o.trafego?.optionNo,
              labelPath: ['trafego', 'optionNo'],
            },
          ]}
        />
      </div>

      {/* Completion */}
      <PvCompletionBlock
        icon="smartphone"
        title={d.completionTitle}
        originalTitle={o.completionTitle}
        titlePath={['completionTitle']}
        description={d.completionYes}
        originalDescription={o.completionYes}
        descriptionPath={['completionYes']}
        badge={d.completionBadge}
        originalBadge={o.completionBadge}
        badgePath={['completionBadge']}
        badgeColor={COLORS.accent}
        etapaId={etapaId}
        onUpdate={onUpdate}
      />
    </div>
  )
}
