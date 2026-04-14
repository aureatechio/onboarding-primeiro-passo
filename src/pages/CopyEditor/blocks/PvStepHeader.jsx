import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Step header with tag pill, title, readTime, and optional alert.
 * Replicates the visual of src/components/StepHeader.jsx without OnboardingContext.
 */
export default function PvStepHeader({
  data,
  originalData,
  etapaId,
  basePath = [],
  onUpdate,
  stepLabel,
  stepNum,
  totalSteps = 7,
  showPersonalized = false,
}) {
  const title = data?.title
  const readTime = data?.readTime
  const alert = data?.alert
  const origTitle = originalData?.title
  const origReadTime = originalData?.readTime
  const origAlert = originalData?.alert

  const labelText = stepLabel || (stepNum ? `ETAPA ${stepNum} DE ${totalSteps}` : null)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {labelText && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: `${COLORS.red}15`,
              border: `1px solid ${COLORS.red}30`,
              borderRadius: 100,
              padding: '4px 12px',
            }}
          >
            <span
              style={{
                color: COLORS.red,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {labelText}
            </span>
          </div>
        )}
        {showPersonalized && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: `${COLORS.magenta}12`,
              border: `1px solid ${COLORS.magenta}25`,
              borderRadius: 100,
              padding: '4px 10px',
            }}
          >
            <span
              style={{
                color: COLORS.magenta,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              PERSONALIZADA
            </span>
          </div>
        )}
      </div>

      {title && (
        <EditableText
          value={title}
          originalValue={origTitle}
          path={[...basePath, 'title']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="h1"
          style={{
            color: COLORS.text,
            fontSize: 28,
            fontWeight: 900,
            margin: '0 0 4px 0',
            letterSpacing: '-0.03em',
          }}
        />
      )}

      {readTime && (
        <EditableText
          value={readTime}
          originalValue={origReadTime}
          path={[...basePath, 'readTime']}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          style={{ color: COLORS.textDim, fontSize: 13, margin: '0 0 12px 0' }}
        />
      )}

      {alert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: `${COLORS.warning}10`,
            border: `1px solid ${COLORS.warning}25`,
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <Icon name="clock" size={14} color={COLORS.warning} />
          <EditableText
            value={alert}
            originalValue={origAlert}
            path={[...basePath, 'alert']}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="span"
            style={{
              color: COLORS.warning,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          />
        </div>
      )}
    </div>
  )
}
