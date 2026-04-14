import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'
import EditableList from '../EditableList'
import PvStepHeader from '../blocks/PvStepHeader'
import PvGradientCard from '../blocks/PvGradientCard'
import PvInfoCard from '../blocks/PvInfoCard'
import PvCompletionBlock from '../blocks/PvCompletionBlock'

export default function Etapa62Preview({ data, originalData, etapaId, onUpdate }) {
  if (!data) return null
  const d = data
  const o = originalData || {}

  return (
    <div>
      <PvStepHeader
        data={d.header} originalData={o.header}
        etapaId={etapaId} basePath={['header']} onUpdate={onUpdate}
        stepLabel={d.header?.stepLabel}
      />

      {/* Bonificação intro */}
      <PvGradientCard gradientFrom={`${COLORS.accent}18`} gradientTo={`${COLORS.accent}05`} borderColor={`${COLORS.accent}30`}>
        <EditableText
          value={d.bonificacaoTitle} originalValue={o.bonificacaoTitle}
          path={['bonificacaoTitle']} etapaId={etapaId} onUpdate={onUpdate}
          as="h3" style={{ color: COLORS.accent, fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 8px 0' }}
        />
        <EditableText
          value={d.bonificacaoBody} originalValue={o.bonificacaoBody}
          path={['bonificacaoBody']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" multiline style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}
        />
      </PvGradientCard>

      {/* Start Kit Info */}
      <PvInfoCard
        icon="zap" iconColor={COLORS.success}
        title="Start Kit"
        body={d.startKitInfo} originalBody={o.startKitInfo} bodyPath={['startKitInfo']}
        etapaId={etapaId} onUpdate={onUpdate}
        borderColor={`${COLORS.success}25`}
      />

      {/* Como funciona */}
      <PvInfoCard
        icon="circleCheck" iconColor={COLORS.accent}
        title={d.comoFunciona?.title} originalTitle={o.comoFunciona?.title} titlePath={['comoFunciona', 'title']}
        body={d.comoFunciona?.body} originalBody={o.comoFunciona?.body} bodyPath={['comoFunciona', 'body']}
        etapaId={etapaId} onUpdate={onUpdate}
      >
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EditableText
            value={d.comoFunciona?.exemploA} originalValue={o.comoFunciona?.exemploA}
            path={['comoFunciona', 'exemploA']} etapaId={etapaId} onUpdate={onUpdate}
            as="p" multiline style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.5, margin: 0, background: `${COLORS.bg}80`, padding: 10, borderRadius: 8 }}
          />
          <EditableText
            value={d.comoFunciona?.exemploB} originalValue={o.comoFunciona?.exemploB}
            path={['comoFunciona', 'exemploB']} etapaId={etapaId} onUpdate={onUpdate}
            as="p" multiline style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.5, margin: 0, background: `${COLORS.bg}80`, padding: 10, borderRadius: 8 }}
          />
        </div>
      </PvInfoCard>

      {/* Form fields (visual representation) */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 14, padding: 20, marginBottom: 12,
      }}>
        <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 16px 0', fontFamily: "'JetBrains Mono', monospace" }}>
          CAMPOS DO FORMULÁRIO
        </p>
        {/* Logo */}
        <EditableText
          value={d.logoLabel} originalValue={o.logoLabel}
          path={['logoLabel']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}
        />
        <EditableText
          value={d.logoHint} originalValue={o.logoHint}
          path={['logoHint']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.textDim, fontSize: 11, margin: '0 0 16px 0' }}
        />
        {/* Site */}
        <EditableText
          value={d.modoSimplificado?.siteLabel} originalValue={o.modoSimplificado?.siteLabel}
          path={['modoSimplificado', 'siteLabel']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}
        />
        <div style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
          <span style={{ color: COLORS.textDim, fontSize: 13 }}>{d.modoSimplificado?.sitePlaceholder}</span>
        </div>
        {/* Instagram */}
        <EditableText
          value={d.modoSimplificado?.instagramLabel} originalValue={o.modoSimplificado?.instagramLabel}
          path={['modoSimplificado', 'instagramLabel']} etapaId={etapaId} onUpdate={onUpdate}
          as="p" style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}
        />
        <div style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ color: COLORS.textDim, fontSize: 13 }}>{d.modoSimplificado?.instagramPrefix}{d.modoSimplificado?.instagramPlaceholder}</span>
        </div>
      </div>

      {/* Processing messages */}
      <EditableList
        items={d.processingMessages || []} originalItems={o.processingMessages || []}
        basePath={['processingMessages']} etapaId={etapaId} onUpdate={onUpdate}
        itemAs="p" itemStyle={{ color: COLORS.textDim, fontSize: 12, margin: '2px 0' }}
      />

      {/* Completion Done */}
      <PvCompletionBlock
        icon="circleCheck"
        title={d.completionDone?.title} originalTitle={o.completionDone?.title} titlePath={['completionDone', 'title']}
        description={d.completionDone?.description} originalDescription={o.completionDone?.description} descriptionPath={['completionDone', 'description']}
        badge={d.completionDone?.badge} originalBadge={o.completionDone?.badge} badgePath={['completionDone', 'badge']}
        badgeColor={COLORS.success} etapaId={etapaId} onUpdate={onUpdate}
      />

      {/* Completion Pending */}
      <PvCompletionBlock
        icon="clock"
        title={d.completionPending?.title} originalTitle={o.completionPending?.title} titlePath={['completionPending', 'title']}
        description={d.completionPending?.description} originalDescription={o.completionPending?.description} descriptionPath={['completionPending', 'description']}
        badge={d.completionPending?.badge} originalBadge={o.completionPending?.badge} badgePath={['completionPending', 'badge']}
        badgeColor={COLORS.warning} etapaId={etapaId} onUpdate={onUpdate}
      />
    </div>
  )
}
