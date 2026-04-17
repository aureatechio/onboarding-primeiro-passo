import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorTheme } from '../AiStep2Monitor/theme'
import { FIELD_TYPES, UI } from './constants'
import FieldEditor from './FieldEditor'

// ─── Schema estático ──────────────────────────────────────────────────────────
// Mapeia cada campo de cada etapa ao tipo de widget e metadados.
// path: caminho dentro do objeto da etapa (ex: ['slide1', 'body'])
// variables: (opcional) para TEMPLATE, lista de variáveis disponíveis

const FT = FIELD_TYPES

const ETAPA_SCHEMAS = {
  etapa1: [
    { path: ['greeting'],      label: 'greeting',       type: FT.TEMPLATE,      variables: ['clientName'] },
    { path: ['title'],         label: 'title',          type: FT.STRING },
    { path: ['subtitle'],      label: 'subtitle',       type: FT.STRING },
    { path: ['estimatedTime'], label: 'estimatedTime',  type: FT.STRING },
    { path: ['ctaButton'],     label: 'ctaButton',      type: FT.STRING },
    { path: ['microCopy'],     label: 'microCopy',      type: FT.TEXTAREA },
    { path: ['stepLabel'],     label: 'stepLabel',      type: FT.STRING },
    { path: ['valueProps'],    label: 'valueProps',     type: FT.STRING_ARRAY },
  ],

  etapa2: [
    { path: ['header', 'title'],           label: 'header.title',          type: FT.STRING },
    { path: ['header', 'readTime'],        label: 'header.readTime',       type: FT.STRING },
    { path: ['pacoteResumo'],              label: 'pacoteResumo',          type: FT.STRING },
    { path: ['slideTitles'],               label: 'slideTitles',           type: FT.STRING_ARRAY },
    { path: ['slide1', 'body'],            label: 'slide1.body',           type: FT.TEXTAREA },
    { path: ['slide1', 'cardLabel'],       label: 'slide1.cardLabel',      type: FT.STRING },
    { path: ['slide1', 'aceleraiLabel'],   label: 'slide1.aceleraiLabel',  type: FT.STRING },
    { path: ['slide1', 'aceleraiDesc'],    label: 'slide1.aceleraiDesc',   type: FT.STRING },
    { path: ['slide1', 'voceLabel'],       label: 'slide1.voceLabel',      type: FT.STRING },
    { path: ['slide1', 'voceDesc'],        label: 'slide1.voceDesc',       type: FT.STRING },
    { path: ['slide2', 'body'],            label: 'slide2.body',           type: FT.TEXTAREA },
    { path: ['slide2', 'steps'],           label: 'slide2.steps',          type: FT.OBJECT_ARRAY },
    { path: ['slide2', 'footer'],          label: 'slide2.footer',         type: FT.TEXTAREA },
    { path: ['slide3', 'body'],            label: 'slide3.body',           type: FT.TEXTAREA },
    { path: ['slide3', 'footer'],          label: 'slide3.footer',         type: FT.TEXTAREA },
    { path: ['slide4', 'body'],            label: 'slide4.body',           type: FT.TEXTAREA },
    { path: ['slide4', 'nossaParte'],      label: 'slide4.nossaParte',     type: FT.NESTED_OBJECT },
    { path: ['slide4', 'suaParte'],        label: 'slide4.suaParte',       type: FT.NESTED_OBJECT },
    { path: ['slide4', 'closingTip'],      label: 'slide4.closingTip',     type: FT.TEXTAREA },
    { path: ['quizTitle'],                 label: 'quizTitle',             type: FT.STRING },
    { path: ['quizSubtitle'],              label: 'quizSubtitle',          type: FT.STRING },
    { path: ['quizQuestions'],             label: 'quizQuestions',         type: FT.STRING_ARRAY },
    { path: ['quizConfirmMessage'],        label: 'quizConfirmMessage',    type: FT.STRING },
    { path: ['completionTitle'],           label: 'completionTitle',       type: FT.STRING },
    { path: ['completionDescription'],     label: 'completionDescription', type: FT.TEXTAREA },
    { path: ['navNextDefault'],            label: 'navNextDefault',        type: FT.STRING },
    { path: ['navNextLast'],               label: 'navNextLast',           type: FT.STRING },
    { path: ['navConfirm'],                label: 'navConfirm',            type: FT.STRING },
    { path: ['processingMessages'],        label: 'processingMessages',    type: FT.STRING_ARRAY },
  ],

  etapa3: [
    { path: ['header', 'title'],          label: 'header.title',         type: FT.STRING },
    { path: ['header', 'readTime'],       label: 'header.readTime',      type: FT.STRING },
    { path: ['header', 'alert'],          label: 'header.alert',         type: FT.TEXTAREA },
    { path: ['slideTitles'],              label: 'slideTitles',          type: FT.STRING_ARRAY },
    { path: ['warningText'],              label: 'warningText',          type: FT.TEXTAREA },
    { path: ['suaParte'],                 label: 'suaParte',             type: FT.NESTED_OBJECT },
    { path: ['nossaParte'],               label: 'nossaParte',           type: FT.NESTED_OBJECT },
    { path: ['clienteAgil'],              label: 'clienteAgil',          type: FT.NESTED_OBJECT },
    { path: ['clienteDemorou'],           label: 'clienteDemorou',       type: FT.NESTED_OBJECT },
    { path: ['agilidadeTip'],             label: 'agilidadeTip',         type: FT.TEXTAREA },
    { path: ['whatsapp'],                 label: 'whatsapp',             type: FT.NESTED_OBJECT },
    { path: ['plataforma'],               label: 'plataforma',           type: FT.NESTED_OBJECT },
    { path: ['canaisTip'],                label: 'canaisTip',            type: FT.TEXTAREA },
    { path: ['quizSubtitle'],             label: 'quizSubtitle',         type: FT.STRING },
    { path: ['quizQuestions'],            label: 'quizQuestions',        type: FT.STRING_ARRAY },
    { path: ['quizConfirmMessage'],       label: 'quizConfirmMessage',   type: FT.STRING },
    { path: ['navConfirmQuiz'],           label: 'navConfirmQuiz',       type: FT.STRING },
    { path: ['navNextDefault'],           label: 'navNextDefault',       type: FT.STRING },
    { path: ['processingMessages'],       label: 'processingMessages',   type: FT.STRING_ARRAY },
    { path: ['activation', 'title'],      label: 'activation.title',     type: FT.STRING },
    { path: ['activation', 'badge'],      label: 'activation.badge',     type: FT.STRING },
    { path: ['activation', 'cardLabel'],  label: 'activation.cardLabel', type: FT.STRING },
    { path: ['activation', 'ctaButton'],  label: 'activation.ctaButton', type: FT.STRING },
    { path: ['activation', 'description'], label: 'activation.description', type: FT.TEMPLATE, variables: ['celebName'] },
    { path: ['activation', 'items'],      label: 'activation.items',     type: FT.OBJECT_ARRAY },
    { path: ['activation', 'nextStepText'], label: 'activation.nextStepText', type: FT.TEXTAREA },
  ],

  etapa4: [
    { path: ['header', 'readTime'],           label: 'header.readTime',             type: FT.STRING },
    { path: ['slide1', 'body'],               label: 'slide1.body',                 type: FT.TEMPLATE, variables: ['celebName'] },
    { path: ['slide1', 'contractLabel'],      label: 'slide1.contractLabel',         type: FT.STRING },
    { path: ['slide1', 'exclusivityTitle'],   label: 'slide1.exclusivityTitle',     type: FT.STRING },
    { path: ['slide1', 'exclusivityBody'],    label: 'slide1.exclusivityBody',      type: FT.TEMPLATE, variables: ['celebName'] },
    { path: ['slide1', 'exampleTitle'],       label: 'slide1.exampleTitle',         type: FT.STRING },
    { path: ['slide1', 'exampleBody'],        label: 'slide1.exampleBody',          type: FT.TEMPLATE, variables: ['celebName', 'praca', 'segmento'] },
    { path: ['slide2', 'body'],               label: 'slide2.body',                 type: FT.TEXTAREA },
    { path: ['slide2', 'flowLabel'],          label: 'slide2.flowLabel',            type: FT.STRING },
    { path: ['slide2', 'steps'],              label: 'slide2.steps',                type: FT.OBJECT_ARRAY },
    { path: ['slide2', 'ajustesTitle'],       label: 'slide2.ajustesTitle',         type: FT.STRING },
    { path: ['slide2', 'ajustesBody'],        label: 'slide2.ajustesBody',          type: FT.TEXTAREA },
    { path: ['slide2', 'celebAjustesTitle'],  label: 'slide2.celebAjustesTitle',    type: FT.STRING },
    { path: ['slide2', 'celebAjustesBody'],   label: 'slide2.celebAjustesBody',     type: FT.TEXTAREA },
    { path: ['slide2', 'regraOuroTitle'],     label: 'slide2.regraOuroTitle',       type: FT.STRING },
    { path: ['slide2', 'regraOuroBody'],      label: 'slide2.regraOuroBody',        type: FT.TEXTAREA },
    { path: ['slide3', 'body'],               label: 'slide3.body',                 type: FT.TEXTAREA },
    { path: ['slide4', 'body'],               label: 'slide4.body',                 type: FT.TEXTAREA },
    { path: ['quizTitle'],                    label: 'quizTitle',                   type: FT.STRING },
    { path: ['quizSubtitle'],                 label: 'quizSubtitle',                type: FT.STRING },
    { path: ['quizConfirmMessage'],           label: 'quizConfirmMessage',          type: FT.STRING },
    { path: ['completionTitle'],              label: 'completionTitle',             type: FT.STRING },
    { path: ['navNextSlide'],                 label: 'navNextSlide',                type: FT.STRING },
    { path: ['navGoToQuiz'],                  label: 'navGoToQuiz',                 type: FT.STRING },
    { path: ['navConfirmAll'],                label: 'navConfirmAll',               type: FT.STRING },
    { path: ['navConcluir'],                  label: 'navConcluir',                 type: FT.STRING },
    { path: ['processingMessages'],           label: 'processingMessages',          type: FT.STRING_ARRAY },
  ],

  etapa5: [
    { path: ['header', 'title'],      label: 'header.title',      type: FT.STRING },
    { path: ['header', 'readTime'],   label: 'header.readTime',   type: FT.STRING },
    { path: ['palco', 'title'],       label: 'palco.title',       type: FT.STRING },
    { path: ['palco', 'body'],        label: 'palco.body',        type: FT.TEXTAREA },
    { path: ['penseAssim'],           label: 'penseAssim',        type: FT.NESTED_OBJECT },
    { path: ['trafego', 'title'],     label: 'trafego.title',     type: FT.STRING },
    { path: ['trafego', 'body'],      label: 'trafego.body',      type: FT.TEXTAREA },
    { path: ['trafego', 'question'],  label: 'trafego.question',  type: FT.STRING },
    { path: ['trafego', 'optionYes'], label: 'trafego.optionYes', type: FT.STRING },
    { path: ['trafego', 'optionNo'],  label: 'trafego.optionNo',  type: FT.STRING },
    { path: ['navNext'],              label: 'navNext',           type: FT.STRING },
    { path: ['completionTitle'],      label: 'completionTitle',   type: FT.STRING },
    { path: ['completionYes'],        label: 'completionYes',     type: FT.TEXTAREA },
    { path: ['completionNo'],         label: 'completionNo',      type: FT.TEXTAREA },
    { path: ['completionBadge'],      label: 'completionBadge',   type: FT.STRING },
  ],

  etapa6: [
    { path: ['header', 'title'],       label: 'header.title',       type: FT.STRING },
    { path: ['header', 'readTime'],    label: 'header.readTime',     type: FT.STRING },
    { path: ['header', 'stepLabel'],   label: 'header.stepLabel',    type: FT.STRING },
    { path: ['intro', 'title'],        label: 'intro.title',         type: FT.STRING },
    { path: ['intro', 'body'],         label: 'intro.body',          type: FT.TEXTAREA },
    { path: ['diferenca'],             label: 'diferenca',           type: FT.NESTED_OBJECT },
    { path: ['itensTitle'],            label: 'itensTitle',          type: FT.STRING },
    { path: ['items'],                 label: 'items',               type: FT.OBJECT_ARRAY },
    { path: ['reassuringTip'],         label: 'reassuringTip',       type: FT.TEXTAREA },
    { path: ['acknowledgement'],       label: 'acknowledgement',     type: FT.TEXTAREA },
    { path: ['navConfirm'],            label: 'navConfirm',          type: FT.STRING },
    { path: ['completionTitle'],       label: 'completionTitle',     type: FT.STRING },
    { path: ['completionDescription'], label: 'completionDescription', type: FT.TEMPLATE, variables: ['atendente'] },
  ],

  etapa62: [
    { path: ['header', 'title'],         label: 'header.title',          type: FT.STRING },
    { path: ['header', 'readTime'],      label: 'header.readTime',        type: FT.STRING },
    { path: ['header', 'stepLabel'],     label: 'header.stepLabel',       type: FT.STRING },
    { path: ['bonificacaoTitle'],        label: 'bonificacaoTitle',        type: FT.TEXTAREA },
    { path: ['bonificacaoBody'],         label: 'bonificacaoBody',         type: FT.TEXTAREA },
    { path: ['startKitInfo'],            label: 'startKitInfo',            type: FT.TEXTAREA },
    { path: ['comoFunciona', 'title'],   label: 'comoFunciona.title',      type: FT.STRING },
    { path: ['comoFunciona', 'body'],    label: 'comoFunciona.body',       type: FT.TEXTAREA },
    { path: ['comoFunciona', 'exemploA'], label: 'comoFunciona.exemploA',  type: FT.TEXTAREA },
    { path: ['comoFunciona', 'exemploB'], label: 'comoFunciona.exemploB',  type: FT.TEXTAREA },
    { path: ['logoLabel'],               label: 'logoLabel',               type: FT.STRING },
    { path: ['logoPlaceholder'],         label: 'logoPlaceholder',         type: FT.STRING },
    { path: ['logoHint'],                label: 'logoHint',                type: FT.STRING },
    { path: ['logoChangeButton'],        label: 'logoChangeButton',        type: FT.STRING },
    { path: ['navConfirm'],              label: 'navConfirm',              type: FT.STRING },
    { path: ['navConfirmPending'],       label: 'navConfirmPending',       type: FT.STRING },
    { path: ['navContinueLater'],        label: 'navContinueLater',        type: FT.STRING },
    { path: ['processingMessages'],      label: 'processingMessages',      type: FT.STRING_ARRAY },
    { path: ['completionDone', 'title'], label: 'completionDone.title',    type: FT.STRING },
    { path: ['completionDone', 'description'], label: 'completionDone.description', type: FT.TEXTAREA },
    { path: ['completionPending', 'title'], label: 'completionPending.title', type: FT.STRING },
    { path: ['completionPending', 'description'], label: 'completionPending.description', type: FT.TEXTAREA },
  ],

  etapaFinal: [
    { path: ['resumo', 'title'],           label: 'resumo.title',           type: FT.STRING },
    { path: ['resumo', 'subtitle'],        label: 'resumo.subtitle',        type: FT.STRING },
    { path: ['resumo', 'cardLabel'],       label: 'resumo.cardLabel',       type: FT.STRING },
    { path: ['resumo', 'pacoteValue'],     label: 'resumo.pacoteValue',     type: FT.STRING },
    { path: ['resumo', 'preparacaoValue'], label: 'resumo.preparacaoValue', type: FT.STRING },
    { path: ['proximosPassosLabel'],       label: 'proximosPassosLabel',    type: FT.STRING },
    { path: ['atendenteLabel'],            label: 'atendenteLabel',         type: FT.STRING },
    { path: ['ctaButton'],                 label: 'ctaButton',              type: FT.STRING },
    { path: ['ctaMicro'],                  label: 'ctaMicro',               type: FT.TEXTAREA },
    { path: ['parabens', 'badge'],         label: 'parabens.badge',         type: FT.STRING },
    { path: ['parabens', 'title'],         label: 'parabens.title',         type: FT.STRING },
    { path: ['parabens', 'body'],          label: 'parabens.body',          type: FT.TEXTAREA },
    { path: ['parabens', 'cta'],           label: 'parabens.cta',           type: FT.TEXTAREA },
    { path: ['parabens', 'closing'],       label: 'parabens.closing',       type: FT.TEXTAREA },
  ],
}

// ─── Helper: pega valor num objeto por path array ─────────────────────────────

function getByPath(obj, path) {
  return path.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj)
}

function hasChanged(current, original) {
  if (typeof current === 'function' || typeof original === 'function') return false
  return JSON.stringify(current) !== JSON.stringify(original)
}

// ─── EtapaSection ─────────────────────────────────────────────────────────────

export default function EtapaSection({ etapaId, data, originalData, onUpdate }) {
  const schema = ETAPA_SCHEMAS[etapaId] ?? []

  if (schema.length === 0) {
    return (
      <p style={{ color: monitorTheme.textMuted, ...TYPE.body }}>{UI.noFieldsMessage}</p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.space[10] }}>
      {schema.map(({ path, label, type, variables }) => {
        const value = getByPath(data, path)
        const original = getByPath(originalData, path)
        const isDirty = hasChanged(value, original)

        return (
          <FieldEditor
            key={path.join('.')}
            type={type}
            value={value}
            onChange={(newValue) => onUpdate(path, newValue)}
            label={label}
            variables={variables}
            isDirty={isDirty}
          />
        )
      })}
    </div>
  )
}
