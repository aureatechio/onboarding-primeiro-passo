import { COLORS } from '../../../theme/colors'
import EditableText from '../EditableText'

const STATUS_COLORS = {
  done: COLORS.success,
  current: COLORS.red,
  next: COLORS.warning,
  future: COLORS.border,
}

/**
 * Preview block: Vertical timeline with colored dots and labels.
 * Used in Etapa3 slide1 (campaign timeline).
 */
export default function PvTimeline({
  items = [],
  originalItems = [],
  basePath,
  etapaId,
  onUpdate,
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 22,
        marginBottom: 12,
      }}
    >
      {items.map((item, i) => {
        const color = STATUS_COLORS[item.status] || COLORS.border
        const isLast = i === items.length - 1

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              position: 'relative',
              paddingBottom: isLast ? 0 : 10,
            }}
          >
            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 18,
                  bottom: 0,
                  width: 2,
                  background: `${COLORS.border}`,
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: color,
                border: `2px solid ${color}`,
                flexShrink: 0,
                marginTop: 2,
                boxShadow: item.status === 'current' ? `0 0 8px ${color}50` : 'none',
              }}
            />

            {/* Label */}
            <div style={{ flex: 1 }}>
              <EditableText
                value={item.label}
                originalValue={originalItems[i]?.label}
                path={[...basePath, i, 'label']}
                etapaId={etapaId}
                onUpdate={(path, value) => {
                  const newItems = [...items]
                  newItems[i] = { ...newItems[i], label: value }
                  onUpdate(basePath, newItems)
                }}
                as="p"
                style={{
                  color: item.status === 'future' ? COLORS.textDim : COLORS.text,
                  fontSize: 13,
                  fontWeight: item.status === 'current' ? 700 : 500,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              />
              {item.tag && (
                <EditableText
                  value={item.tag}
                  originalValue={originalItems[i]?.tag}
                  path={[...basePath, i, 'tag']}
                  etapaId={etapaId}
                  onUpdate={(path, value) => {
                    const newItems = [...items]
                    newItems[i] = { ...newItems[i], tag: value }
                    onUpdate(basePath, newItems)
                  }}
                  as="span"
                  style={{
                    display: 'inline-block',
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: `${color}18`,
                    color: color,
                    padding: '1px 6px',
                    borderRadius: 4,
                    marginTop: 4,
                    letterSpacing: '0.05em',
                  }}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
