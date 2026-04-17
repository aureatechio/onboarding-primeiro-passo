import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key)
}

function normalizeNum(items) {
  const hasNum = items.some((item) => hasOwn(item, 'num'))
  if (!hasNum) return items

  return items.map((item, index) => {
    if (!hasOwn(item, 'num')) return item
    return { ...item, num: String(index + 1) }
  })
}

function inferTemplate(items, originalItems) {
  const source = items[0] || originalItems[0]
  if (source && typeof source === 'object') {
    const template = {}

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'string') {
        template[key] = ''
      } else {
        template[key] = value
      }
    }

    return template
  }

  return {
    num: '',
    title: '',
    desc: '',
  }
}

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
  const addItem = () => {
    const template = inferTemplate(items, originalItems)
    const nextItems = normalizeNum([...items, template])
    onUpdate(basePath, nextItems)
  }

  const removeItem = (indexToRemove) => {
    const nextItems = normalizeNum(items.filter((_, index) => index !== indexToRemove))
    onUpdate(basePath, nextItems)
  }

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
            {hasOwn(item, 'title') && (
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
            {(hasOwn(item, 'desc') || hasOwn(item, 'label')) && (
              <EditableText
                value={item.desc || item.label}
                originalValue={originalItems[i]?.desc || originalItems[i]?.label}
                path={[...basePath, i, hasOwn(item, 'desc') ? 'desc' : 'label']}
                etapaId={etapaId}
                onUpdate={(path, value) => {
                  const field = hasOwn(item, 'desc') ? 'desc' : 'label'
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

          <button
            type="button"
            onClick={() => removeItem(i)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1px solid ${COLORS.danger}40`,
              background: `${COLORS.danger}15`,
              color: COLORS.danger,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Remover passo"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{
          marginTop: 8,
          alignSelf: 'flex-start',
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.textDim,
          background: 'transparent',
          border: `1px dashed ${COLORS.border}`,
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.accent
          e.currentTarget.style.color = COLORS.accent
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border
          e.currentTarget.style.color = COLORS.textDim
        }}
      >
        + Adicionar passo
      </button>
    </div>
  )
}
