import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import PvSlideDivider from '../blocks/PvSlideDivider'
import PvInfoCard from '../blocks/PvInfoCard'
import PvNumberedSteps from '../blocks/PvNumberedSteps'
import PvAlertBox from '../blocks/PvAlertBox'
import PvQuizBlock from '../blocks/PvQuizBlock'
import PvCompletionBlock from '../blocks/PvCompletionBlock'
import PvBulletListCard from '../blocks/PvBulletListCard'
import Icon from '../../../components/Icon'
import { PREVIEW_EXAMPLE_VALUES } from '../constants'

export default function Etapa4Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  // Quiz questions are a function in copy.js — render with example values
  const quizQs = typeof d.quizQuestions === 'function'
    ? d.quizQuestions(PREVIEW_EXAMPLE_VALUES.celebName, PREVIEW_EXAMPLE_VALUES.praca, PREVIEW_EXAMPLE_VALUES.segmento)
    : d.quizQuestions || []
  const origQuizQs = typeof o.quizQuestions === 'function'
    ? o.quizQuestions(PREVIEW_EXAMPLE_VALUES.celebName, PREVIEW_EXAMPLE_VALUES.praca, PREVIEW_EXAMPLE_VALUES.segmento)
    : o.quizQuestions || []

  return (
    <div>
      {/* ── Slide 4.1 — Exclusividade ── */}
      <PvSlideDivider tag="4.1" />
      <EditableText
        value={d.slideHeaders?.[0]?.title} originalValue={o.slideHeaders?.[0]?.title}
        path={['slideHeaders', 0, 'title']} etapaId={etapaId}
        onUpdate={(path, val) => {
          const arr = [...(d.slideHeaders || [])]
          arr[0] = { ...arr[0], title: val }
          onUpdate(['slideHeaders'], arr)
        }}
        as="h2" style={{ color: COLORS.text, fontSize: 20, fontWeight: 800, margin: '0 0 12px 0' }}
      />
      <EditableText
        value={d.slide1?.body} originalValue={o.slide1?.body}
        path={['slide1', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline
        style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />

      {/* Contract card visual */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.bg})`,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14, padding: 20, marginBottom: 12, textAlign: 'center',
      }}>
        <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 12px 0', fontFamily: "'JetBrains Mono', monospace" }}>
          {d.slide1?.contractLabel}
        </p>
        <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>{PREVIEW_EXAMPLE_VALUES.celebName}</p>
        <p style={{ color: COLORS.accent, fontSize: 16, margin: '0 0 4px 0' }}>{PREVIEW_EXAMPLE_VALUES.praca}</p>
        <p style={{ color: COLORS.warning, fontSize: 16, margin: 0 }}>{PREVIEW_EXAMPLE_VALUES.segmento}</p>
      </div>

      <PvInfoCard
        icon="lock" iconColor={COLORS.accent}
        title={d.slide1?.exclusivityTitle} originalTitle={o.slide1?.exclusivityTitle} titlePath={['slide1', 'exclusivityTitle']}
        body={d.slide1?.exclusivityBody} originalBody={o.slide1?.exclusivityBody} bodyPath={['slide1', 'exclusivityBody']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.accent}25`}
      />
      <PvInfoCard
        icon="mapPin" iconColor={COLORS.warning}
        title={d.slide1?.exampleTitle} originalTitle={o.slide1?.exampleTitle} titlePath={['slide1', 'exampleTitle']}
        body={d.slide1?.exampleBody} originalBody={o.slide1?.exampleBody} bodyPath={['slide1', 'exampleBody']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.warning}25`}
      />

      {/* ── Slide 4.2 — Aprovação ── */}
      <PvSlideDivider tag="4.2" />
      <EditableText
        value={d.slide2?.body} originalValue={o.slide2?.body}
        path={['slide2', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvNumberedSteps
        items={d.slide2?.steps || []} originalItems={o.slide2?.steps || []}
        basePath={['slide2', 'steps']} etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvInfoCard
        icon="penLine" iconColor={COLORS.accent}
        title={d.slide2?.ajustesTitle} originalTitle={o.slide2?.ajustesTitle} titlePath={['slide2', 'ajustesTitle']}
        body={d.slide2?.ajustesBody} originalBody={o.slide2?.ajustesBody} bodyPath={['slide2', 'ajustesBody']}
        etapaId={etapaId} onUpdate={onUpdate} borderColor={`${COLORS.accent}25`}
      />
      <PvInfoCard
        icon="alertTriangle" iconColor={COLORS.warning}
        title={d.slide2?.celebAjustesTitle} originalTitle={o.slide2?.celebAjustesTitle} titlePath={['slide2', 'celebAjustesTitle']}
        body={d.slide2?.celebAjustesBody} originalBody={o.slide2?.celebAjustesBody} bodyPath={['slide2', 'celebAjustesBody']}
        etapaId={etapaId} onUpdate={onUpdate} borderColor={`${COLORS.warning}25`}
      />
      <PvAlertBox
        text={d.slide2?.regraOuroBody} originalText={o.slide2?.regraOuroBody}
        path={['slide2', 'regraOuroBody']} etapaId={etapaId} onUpdate={onUpdate}
        variant="danger" icon="gem"
      />

      {/* ── Slide 4.3 — Franquias ── */}
      <PvSlideDivider tag="4.3" />
      <EditableText
        value={d.slide3?.body} originalValue={o.slide3?.body}
        path={['slide3', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvInfoCard
        icon="building2" iconColor={COLORS.text}
        title={d.slide3?.franquias?.title} originalTitle={o.slide3?.franquias?.title} titlePath={['slide3', 'franquias', 'title']}
        body={d.slide3?.franquias?.allowed} originalBody={o.slide3?.franquias?.allowed} bodyPath={['slide3', 'franquias', 'allowed']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvInfoCard
        icon="smartphone" iconColor={COLORS.text}
        title={d.slide3?.canaisDigitais?.title} originalTitle={o.slide3?.canaisDigitais?.title} titlePath={['slide3', 'canaisDigitais', 'title']}
        body={d.slide3?.canaisDigitais?.allowed} originalBody={o.slide3?.canaisDigitais?.allowed} bodyPath={['slide3', 'canaisDigitais', 'allowed']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvInfoCard
        icon="ban" iconColor={COLORS.danger}
        title={d.slide3?.regrasPublicacao?.title} originalTitle={o.slide3?.regrasPublicacao?.title} titlePath={['slide3', 'regrasPublicacao', 'title']}
        body={d.slide3?.regrasPublicacao?.noTag} originalBody={o.slide3?.regrasPublicacao?.noTag} bodyPath={['slide3', 'regrasPublicacao', 'noTag']}
        etapaId={etapaId} onUpdate={onUpdate} borderColor={`${COLORS.danger}25`}
      />
      <PvInfoCard
        icon="tv" iconColor={COLORS.warning}
        title={d.slide3?.tvRadioOutdoor?.title} originalTitle={o.slide3?.tvRadioOutdoor?.title} titlePath={['slide3', 'tvRadioOutdoor', 'title']}
        body={d.slide3?.tvRadioOutdoor?.warning} originalBody={o.slide3?.tvRadioOutdoor?.warning} bodyPath={['slide3', 'tvRadioOutdoor', 'warning']}
        etapaId={etapaId} onUpdate={onUpdate} borderColor={`${COLORS.warning}25`}
      />

      {/* ── Slide 4.4 — Encerramento ── */}
      <PvSlideDivider tag="4.4" />
      <EditableText
        value={d.slide4?.body} originalValue={o.slide4?.body}
        path={['slide4', 'body']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" multiline style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: '0 0 16px 0' }}
      />
      <PvInfoCard
        icon="refreshCw" iconColor={COLORS.accent}
        title={d.slide4?.renovacao?.title} originalTitle={o.slide4?.renovacao?.title} titlePath={['slide4', 'renovacao', 'title']}
        etapaId={etapaId} onUpdate={onUpdate}
      >
        <PvBulletListCard
          items={d.slide4?.renovacao?.steps || []} originalItems={o.slide4?.renovacao?.steps || []}
          itemsPath={['slide4', 'renovacao', 'steps']} etapaId={etapaId} onUpdate={onUpdate}
        />
      </PvInfoCard>
      <PvAlertBox
        text={d.slide4?.multa?.desc} originalText={o.slide4?.multa?.desc}
        path={['slide4', 'multa', 'desc']} etapaId={etapaId} onUpdate={onUpdate}
        variant="danger" icon="scale"
      />

      {/* ── Quiz ── */}
      <PvSlideDivider tag="QUIZ" />
      <PvQuizBlock
        title={d.quizTitle} originalTitle={o.quizTitle} titlePath={['quizTitle']}
        subtitle={d.quizSubtitle} originalSubtitle={o.quizSubtitle} subtitlePath={['quizSubtitle']}
        questions={quizQs} originalQuestions={origQuizQs} questionsPath={['quizQuestions']}
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
