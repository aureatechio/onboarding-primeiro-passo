import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import PvStepHeader from '../blocks/PvStepHeader'
import PvInfoCard from '../blocks/PvInfoCard'
import PvTwoColumnCard from '../blocks/PvTwoColumnCard'
import PvNumberedSteps from '../blocks/PvNumberedSteps'
import PvAlertBox from '../blocks/PvAlertBox'
import PvCompletionBlock from '../blocks/PvCompletionBlock'
import Icon from '../../../components/Icon'

export default function Etapa6Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div>
      <PvStepHeader
        data={d.header} originalData={o.header}
        etapaId={etapaId} basePath={['header']} onUpdate={onUpdate}
        stepLabel={d.header?.stepLabel}
        showPersonalized
      />

      <PvInfoCard
        icon="palette" iconColor={COLORS.magenta}
        title={d.intro?.title} originalTitle={o.intro?.title} titlePath={['intro', 'title']}
        body={d.intro?.body} originalBody={o.intro?.body} bodyPath={['intro', 'body']}
        etapaId={etapaId} onUpdate={onUpdate}
        bgTint={`linear-gradient(135deg, ${COLORS.magenta}15, ${COLORS.magenta}05)`}
        borderColor={`${COLORS.magenta}25`}
      />

      <PvTwoColumnCard
        label={d.diferenca?.label} originalLabel={o.diferenca?.label} labelPath={['diferenca', 'label']}
        leftIcon="circleCheck" leftColor={COLORS.success}
        leftLabel={d.diferenca?.comReferencias?.label} originalLeftLabel={o.diferenca?.comReferencias?.label} leftLabelPath={['diferenca', 'comReferencias', 'label']}
        leftDesc={d.diferenca?.comReferencias?.desc} originalLeftDesc={o.diferenca?.comReferencias?.desc} leftDescPath={['diferenca', 'comReferencias', 'desc']}
        rightIcon="alertTriangle" rightColor={COLORS.danger}
        rightLabel={d.diferenca?.semReferencias?.label} originalRightLabel={o.diferenca?.semReferencias?.label} rightLabelPath={['diferenca', 'semReferencias', 'label']}
        rightDesc={d.diferenca?.semReferencias?.desc} originalRightDesc={o.diferenca?.semReferencias?.desc} rightDescPath={['diferenca', 'semReferencias', 'desc']}
        etapaId={etapaId} onUpdate={onUpdate}
      />

      <PvNumberedSteps
        items={d.items || []} originalItems={o.items || []}
        basePath={['items']} etapaId={etapaId} onUpdate={onUpdate}
        badgeColor={COLORS.magenta}
      />

      <PvAlertBox
        text={d.reassuringTip} originalText={o.reassuringTip}
        path={['reassuringTip']} etapaId={etapaId} onUpdate={onUpdate}
        variant="success" icon="circleCheck"
      />

      {/* Checkbox acknowledgement */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: 14, borderRadius: 12,
        border: `1.5px solid ${COLORS.success}60`,
        background: `${COLORS.success}06`,
        marginBottom: 16,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${COLORS.success}`,
          background: COLORS.success,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={13} color={COLORS.bg} />
        </div>
        <EditableText
          value={d.acknowledgement} originalValue={o.acknowledgement}
          path={['acknowledgement']} etapaId={etapaId} onUpdate={onUpdate}
          as="span" multiline
          style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.5 }}
        />
      </div>

      <PvCompletionBlock
        title={d.completionTitle} originalTitle={o.completionTitle} titlePath={['completionTitle']}
        description={d.completionDescription} originalDescription={o.completionDescription} descriptionPath={['completionDescription']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
    </div>
  )
}
