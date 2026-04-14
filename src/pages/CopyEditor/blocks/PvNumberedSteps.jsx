import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

/**
 * Preview block: Numbered step items with badge, title, description.
 * Used in Etapa2 slide2, Etapa3 activation, Etapa4 slide2, etc.
 */
export default function PvNumberedSteps({
  items = [],
  originalItems = [],
  basePath,
  etapaId,
  onUpdate,
  badgeColor = COLORS.red,
  showLine = true,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            padding: '12px 0',
            position: 'relative',
          }}
        >
          {/* Connector line */}
          {showLine && i < items.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 15,
                top: 40,
                bottom: -4,
                width: 2,
                background: `${COLORS.border}`,
              }}
            />
          )}

          {/* Badge */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `${badgeColor}18`,
              border: `1px solid ${badgeColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.icon ? (
              <Icon name={item.icon} size={15} color={badgeColor} />
            ) : (
              <span
                style={{
                  color: badgeColor,
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.num || i + 1}
              </span>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {item.title && (
              <EditableText
                value={item.title}
                originalValue={originalItems[i]?.title}
                path={[...basePath, i, 'title']}
                etapaId={etapaId}
                onUpdate={(path, value) => {
                  const newItems = [...items]
                  newItems[i] = { ...newItems[i], title: value }
                  onUpdate(basePath, newItems)
                }}
                as="p"
                style={{
                  color: COLORS.text,
                  fontSize: 13,
                  fontWeight: 700,
                  margin: '0 0 2px 0',
                }}
              />
            )}
            {(item.desc || item.label) && (
              <EditableText
                value={item.desc || item.label}
                originalValue={originalItems[i]?.desc || originalItems[i]?.label}
                path={[...basePath, i, item.desc ? 'desc' : 'label']}
                etapaId={etapaId}
                onUpdate={(path, value) => {
                  const field = item.desc ? 'desc' : 'label'
                  const newItems = [...items]
                  newItems[i] = { ...newItems[i], [field]: value }
                  onUpdate(basePath, newItems)
                }}
                as="p"
                multiline
                style={{
                  color: COLORS.textMuted,
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
