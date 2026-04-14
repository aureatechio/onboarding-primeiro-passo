import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import PvStepHeader from '../blocks/PvStepHeader'
import PvSlideDivider from '../blocks/PvSlideDivider'
import PvTimeline from '../blocks/PvTimeline'
import PvNumberedSteps from '../blocks/PvNumberedSteps'
import PvBulletListCard from '../blocks/PvBulletListCard'
import PvAlertBox from '../blocks/PvAlertBox'
import PvInfoCard from '../blocks/PvInfoCard'
import PvQuizBlock from '../blocks/PvQuizBlock'
import PvCompletionBlock from '../blocks/PvCompletionBlock'

export default function Etapa3Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div>
      <PvStepHeader
        data={d.header} originalData={o.header}
        etapaId={etapaId} basePath={['header']} onUpdate={onUpdate}
        stepNum={3}
      />

      {/* ── Slide 3.1 — Timeline ── */}
      <PvSlideDivider tag="3.1" />
      <PvTimeline
        items={d.timeline || []} originalItems={o.timeline || []}
        basePath={['timeline']} etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* ── Slide 3.2 — Prazos ── */}
      <PvSlideDivider tag="3.2" />
      <PvNumberedSteps
        items={d.prazosProducao?.items || []} originalItems={o.prazosProducao?.items || []}
        basePath={['prazosProducao', 'items']} etapaId={etapaId} onUpdate={onUpdate}
        badgeColor={COLORS.red}
      />
      <PvAlertBox
        text={d.prazosProducao?.alertTip} originalText={o.prazosProducao?.alertTip}
        path={['prazosProducao', 'alertTip']} etapaId={etapaId} onUpdate={onUpdate}
        variant="danger" icon="alertTriangle"
      />

      {/* ── Slide 3.3 — Responsabilidades ── */}
      <PvSlideDivider tag="3.3" />
      <PvBulletListCard
        icon="target" iconColor={COLORS.accent}
        label={d.suaParte?.label} originalLabel={o.suaParte?.label} labelPath={['suaParte', 'label']}
        items={d.suaParte?.items || []} originalItems={o.suaParte?.items || []} itemsPath={['suaParte', 'items']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvBulletListCard
        icon="clapperboard" iconColor={COLORS.red}
        label={d.nossaParte?.label} originalLabel={o.nossaParte?.label} labelPath={['nossaParte', 'label']}
        items={d.nossaParte?.items || []} originalItems={o.nossaParte?.items || []} itemsPath={['nossaParte', 'items']}
        etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* ── Slide 3.4 — Cenários ── */}
      <PvSlideDivider tag="3.4" />
      <PvAlertBox
        text={d.warningText} originalText={o.warningText}
        path={['warningText']} etapaId={etapaId} onUpdate={onUpdate}
        variant="warning" icon="alertTriangle"
      />
      <PvInfoCard
        icon="circleCheck" iconColor={COLORS.success}
        title={d.clienteAgil?.label} originalTitle={o.clienteAgil?.label} titlePath={['clienteAgil', 'label']}
        body={d.clienteAgil?.desc} originalBody={o.clienteAgil?.desc} bodyPath={['clienteAgil', 'desc']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.success}25`}
      />
      <PvInfoCard
        icon="alertTriangle" iconColor={COLORS.danger}
        title={d.clienteDemorou?.label} originalTitle={o.clienteDemorou?.label} titlePath={['clienteDemorou', 'label']}
        body={d.clienteDemorou?.desc} originalBody={o.clienteDemorou?.desc} bodyPath={['clienteDemorou', 'desc']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.danger}25`}
      />
      <EditableText
        value={d.agilidadeTip} originalValue={o.agilidadeTip}
        path={['agilidadeTip']} etapaId={etapaId} onUpdate={onUpdate}
        as="p" style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, textAlign: 'center', margin: '12px 0' }}
      />

      {/* ── Slide 3.5 — Canais ── */}
      <PvSlideDivider tag="3.5" />
      <PvInfoCard
        icon="messageCircle" iconColor={COLORS.whatsapp}
        title={d.whatsapp?.title} originalTitle={o.whatsapp?.title} titlePath={['whatsapp', 'title']}
        body={d.whatsapp?.desc} originalBody={o.whatsapp?.desc} bodyPath={['whatsapp', 'desc']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.whatsapp}25`}
      />
      <PvInfoCard
        icon="monitor" iconColor={COLORS.red}
        title={d.plataforma?.title} originalTitle={o.plataforma?.title} titlePath={['plataforma', 'title']}
        body={d.plataforma?.desc} originalBody={o.plataforma?.desc} bodyPath={['plataforma', 'desc']}
        etapaId={etapaId} onUpdate={onUpdate}
      />
      <PvAlertBox
        text={d.canaisTip} originalText={o.canaisTip}
        path={['canaisTip']} etapaId={etapaId} onUpdate={onUpdate}
        variant="warning" icon="clock"
      />

      {/* ── Quiz ── */}
      <PvSlideDivider tag="QUIZ" />
      <PvQuizBlock
        title="Confirme o entendimento"
        subtitle={d.quizSubtitle} originalSubtitle={o.quizSubtitle} subtitlePath={['quizSubtitle']}
        questions={d.quizQuestions || []} originalQuestions={o.quizQuestions || []} questionsPath={['quizQuestions']}
        confirmMessage={d.quizConfirmMessage} originalConfirmMessage={o.quizConfirmMessage} confirmMessagePath={['quizConfirmMessage']}
        icon="clock" etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* ── Activation ── */}
      <PvSlideDivider tag="ATIVAÇÃO" />
      <PvCompletionBlock
        title={d.activation?.title} originalTitle={o.activation?.title} titlePath={['activation', 'title']}
        description={d.activation?.description} originalDescription={o.activation?.description} descriptionPath={['activation', 'description']}
        badge={d.activation?.badge} originalBadge={o.activation?.badge} badgePath={['activation', 'badge']}
        badgeColor={COLORS.warning}
        etapaId={etapaId} onUpdate={onUpdate}
      >
        <PvNumberedSteps
          items={d.activation?.items || []} originalItems={o.activation?.items || []}
          basePath={['activation', 'items']} etapaId={etapaId} onUpdate={onUpdate}
          badgeColor={COLORS.accent}
        />
      </PvCompletionBlock>
    </div>
  )
}
