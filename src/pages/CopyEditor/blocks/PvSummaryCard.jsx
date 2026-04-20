import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Summary card with rows of icon + label + value.
 * Used in EtapaFinal resumo section and completion summaries.
 */
export default function PvSummaryCard({
  cardLabel,
  originalCardLabel,
  cardLabelPath,
  rows = [],
  etapaId,
  onUpdate,
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 14,
        border: `1px solid ${COLORS.border}`,
        padding: 22,
        marginBottom: 16,
      }}
    >
      {cardLabel && (
        <EditableText
          value={cardLabel}
          originalValue={originalCardLabel}
          path={cardLabelPath}
          etapaId={etapaId}
          onUpdate={onUpdate}
          as="p"
          style={{
            color: COLORS.textDim,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            margin: '0 0 16px 0',
          }}
        />
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {row.icon && (
              <Icon name={row.icon} size={15} color={row.color || COLORS.text} />
            )}
            <span style={{ color: COLORS.textDim, fontSize: 12, fontWeight: 600 }}>
              {row.label}
            </span>
          </div>
          {row.valuePath ? (
            <EditableText
              value={row.value}
              originalValue={row.originalValue}
              path={row.valuePath}
              etapaId={etapaId}
              onUpdate={onUpdate}
              as="span"
              style={{ color: row.color || COLORS.text, fontSize: 13, fontWeight: 600 }}
            />
          ) : (
            <span style={{ color: row.color || COLORS.text, fontSize: 13, fontWeight: 600 }}>
              {row.value}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
