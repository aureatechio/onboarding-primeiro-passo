import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'
import EditableList from '../EditableList'

/**
 * Preview block: Quiz confirmation section with title, subtitle, checkbox questions.
 * Replicates QuizConfirmation.jsx visual. Checkboxes are non-interactive (visual only).
 */
export default function PvQuizBlock({
  title,
  originalTitle,
  titlePath,
  subtitle,
  originalSubtitle,
  subtitlePath,
  questions = [],
  originalQuestions = [],
  questionsPath,
  confirmMessage,
  originalConfirmMessage,
  confirmMessagePath,
  icon = 'check',
  etapaId,
  onUpdate,
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${COLORS.accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} color={COLORS.accent} />
        </div>
        <div>
          {title && (
            <EditableText
              value={title}
              originalValue={originalTitle}
              path={titlePath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{ color: COLORS.text, fontSize: 16, fontWeight: 800, margin: 0 }}
            />
          )}
          {subtitle && (
            <EditableText
              value={subtitle}
              originalValue={originalSubtitle}
              path={subtitlePath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="p"
              style={{ color: COLORS.textDim, fontSize: 12, margin: '3px 0 0 0' }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(Array.isArray(questions) ? questions : []).map((q, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: 14,
              borderRadius: 12,
              border: `1.5px solid ${i === 0 ? COLORS.success + '60' : COLORS.border}`,
              background: i === 0 ? `${COLORS.success}06` : COLORS.inputBg,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                flexShrink: 0,
                border: `2px solid ${i === 0 ? COLORS.success : COLORS.textDim}`,
                background: i === 0 ? COLORS.success : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i === 0 && <Icon name="check" size={15} color={COLORS.bg} />}
            </div>
            <EditableText
              value={q}
              originalValue={originalQuestions[i]}
              path={[...questionsPath, i]}
              etapaId={etapaId}
              onUpdate={(path, value) => {
                const newQ = [...questions]
                newQ[i] = value
                onUpdate(questionsPath, newQ)
              }}
              as="span"
              multiline
              style={{
                color: i === 0 ? COLORS.text : COLORS.textMuted,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            />
          </div>
        ))}
      </div>

      {confirmMessage && (
        <div
          style={{
            background: `${COLORS.success}08`,
            border: `1px solid ${COLORS.success}20`,
            borderRadius: 10,
            padding: 12,
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <EditableText
            value={confirmMessage}
            originalValue={originalConfirmMessage}
            path={confirmMessagePath}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="span"
            style={{ color: COLORS.success, fontSize: 13, fontWeight: 600 }}
          />
        </div>
      )}
    </div>
  )
}
