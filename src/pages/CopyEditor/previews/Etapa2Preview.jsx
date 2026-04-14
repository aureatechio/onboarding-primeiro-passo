import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import EditableList from '../EditableList'
import PvStepHeader from '../blocks/PvStepHeader'
import PvSlideDivider from '../blocks/PvSlideDivider'
import PvTwoColumnCard from '../blocks/PvTwoColumnCard'
import PvNumberedSteps from '../blocks/PvNumberedSteps'
import PvGradientCard from '../blocks/PvGradientCard'
import PvBulletListCard from '../blocks/PvBulletListCard'
import PvQuizBlock from '../blocks/PvQuizBlock'
import PvCompletionBlock from '../blocks/PvCompletionBlock'
import { PREVIEW_EXAMPLE_VALUES } from '../constants'

export default function Etapa2Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div>
      <PvStepHeader
        data={d.header}
        originalData={o.header}
        etapaId={etapaId}
        basePath={['header']}
        onUpdate={onUpdate}
        stepNum={2}
      />

      {/* ── Slide 2.1 ── */}
      <PvSlideDivider tag="2.1" />
      <EditableText
        value={d.slideTitles?.[0]}
        originalValue={o.slideTitles?.[0]}
        path={['slideTitles', 0]}
        etapaId={etapaId}
        onUpdate={(path, val) => {
          const arr = [...(d.slideTitles || [])]
          arr[0] = val
          onUpdate(['slideTitles'], arr)
        }}
        as="h2"
        style={{ color: COLORS.text, fontSize: 20, fontWeight: 800, margin: '0 0 12px 0' }}
      />
      <EditableText
        value={d.slide1?.body} originalValue={o.slide1?.body}
        path={['slide1', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvTwoColumnCard
        label={d.slide1?.cardLabel} originalLabel={o.slide1?.cardLabel} labelPath={['slide1', 'cardLabel']}
        leftIcon="clapperboard" leftColor={COLORS.red}
        leftLabel={d.slide1?.aceleraiLabel} originalLeftLabel={o.slide1?.aceleraiLabel} leftLabelPath={['slide1', 'aceleraiLabel']}
        leftDesc={d.slide1?.aceleraiDesc} originalLeftDesc={o.slide1?.aceleraiDesc} leftDescPath={['slide1', 'aceleraiDesc']}
        rightIcon="target" rightColor={COLORS.accent}
        rightLabel={d.slide1?.voceLabel} originalRightLabel={o.slide1?.voceLabel} rightLabelPath={['slide1', 'voceLabel']}
        rightDesc={d.slide1?.voceDesc} originalRightDesc={o.slide1?.voceDesc} rightDescPath={['slide1', 'voceDesc']}
        etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* ── Slide 2.2 ── */}
      <PvSlideDivider tag="2.2" />
      <EditableText
        value={d.slideTitles?.[1]} originalValue={o.slideTitles?.[1]}
        path={['slideTitles', 1]} etapaId={etapaId}
        onUpdate={(path, val) => { const arr = [...(d.slideTitles || [])]; arr[1] = val; onUpdate(['slideTitles'], arr) }}
        as="h2" style={{ color: COLORS.text, fontSize: 20, fontWeight: 800, margin: '0 0 12px 0' }}
      />
      <EditableText
        value={d.slide2?.body} originalValue={o.slide2?.body}
        path={['slide2', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvNumberedSteps
        items={d.slide2?.steps || []} originalItems={o.slide2?.steps || []}
        basePath={['slide2', 'steps']} etapaId={etapaId} onUpdate={onUpdate}
      />
      <EditableText
        value={d.slide2?.footer} originalValue={o.slide2?.footer}
        path={['slide2', 'footer']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.6, margin: '12px 0 0 0', fontStyle: 'italic' }}
      />

      {/* ── Slide 2.3 ── */}
      <PvSlideDivider tag="2.3" />
      <EditableText
        value={d.slideTitles?.[2]} originalValue={o.slideTitles?.[2]}
        path={['slideTitles', 2]} etapaId={etapaId}
        onUpdate={(path, val) => { const arr = [...(d.slideTitles || [])]; arr[2] = val; onUpdate(['slideTitles'], arr) }}
        as="h2" style={{ color: COLORS.text, fontSize: 20, fontWeight: 800, margin: '0 0 12px 0' }}
      />
      <EditableText
        value={d.slide3?.body} originalValue={o.slide3?.body}
        path={['slide3', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 12px 0' }}
      />
      <PvGradientCard gradientFrom={`${COLORS.magenta}15`} gradientTo={`${COLORS.magenta}05`} borderColor={`${COLORS.magenta}25`}>
        <EditableText
          value={d.pacoteResumo} originalValue={o.pacoteResumo}
          path={['pacoteResumo']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: 0, textAlign: 'center' }}
        />
      </PvGradientCard>
      <EditableText
        value={d.slide3?.footer} originalValue={o.slide3?.footer}
        path={['slide3', 'footer']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.6, margin: '8px 0 0 0' }}
      />

      {/* ── Slide 2.4 ── */}
      <PvSlideDivider tag="2.4" />
      <EditableText
        value={d.slideTitles?.[3]} originalValue={o.slideTitles?.[3]}
        path={['slideTitles', 3]} etapaId={etapaId}
        onUpdate={(path, val) => { const arr = [...(d.slideTitles || [])]; arr[3] = val; onUpdate(['slideTitles'], arr) }}
        as="h2" style={{ color: COLORS.text, fontSize: 20, fontWeight: 800, margin: '0 0 12px 0' }}
      />
      <EditableText
        value={d.slide4?.body} originalValue={o.slide4?.body}
        path={['slide4', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvBulletListCard
        icon="clapperboard" iconColor={COLORS.red}
        label={d.slide4?.nossaParte?.label} originalLabel={o.slide4?.nossaParte?.label} labelPath={['slide4', 'nossaParte', 'label']}
        items={d.slide4?.nossaParte?.items || []} originalItems={o.slide4?.nossaParte?.items || []} itemsPath={['slide4', 'nossaParte', 'items']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvBulletListCard
        icon="target" iconColor={COLORS.accent}
        label={d.slide4?.suaParte?.label} originalLabel={o.slide4?.suaParte?.label} labelPath={['slide4', 'suaParte', 'label']}
        items={d.slide4?.suaParte?.items || []} originalItems={o.slide4?.suaParte?.items || []} itemsPath={['slide4', 'suaParte', 'items']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <EditableText
        value={d.slide4?.closingTip} originalValue={o.slide4?.closingTip}
        path={['slide4', 'closingTip']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, textAlign: 'center', margin: '12px 0 0 0' }}
      />

      {/* ── Quiz ── */}
      <PvSlideDivider tag="QUIZ" />
      <PvQuizBlock
        title={d.quizTitle} originalTitle={o.quizTitle} titlePath={['quizTitle']}
        subtitle={d.quizSubtitle} originalSubtitle={o.quizSubtitle} subtitlePath={['quizSubtitle']}
        questions={d.quizQuestions || []} originalQuestions={o.quizQuestions || []} questionsPath={['quizQuestions']}
        confirmMessage={d.quizConfirmMessage} originalConfirmMessage={o.quizConfirmMessage} confirmMessagePath={['quizConfirmMessage']}
        etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* ── Completion ── */}
      <PvCompletionBlock
        title={d.completionTitle} originalTitle={o.completionTitle} titlePath={['completionTitle']}
        description={d.completionDescription} originalDescription={o.completionDescription} descriptionPath={['completionDescription']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
    </div>
  )
}
