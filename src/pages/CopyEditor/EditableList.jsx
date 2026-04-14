import { COLORS } from '../../theme/colors'
import EditableText from './EditableText'

/**
 * EditableList — Renderiza array de strings com edicao inline.
 * Cada item e EditableText. Suporta add/remove.
 */
export default function EditableList({
  items = [],
  originalItems = [],
  basePath,
  etapaId,
  onUpdate,
  itemAs = 'p',
  itemStyle = {},
  bulletIcon,
  bulletColor,
  addLabel = '+ Adicionar item',
  renderPrefix,
}) {
  const handleUpdateItem = (index, path, value) => {
    const newItems = [...items]
    newItems[index] = value
    onUpdate(basePath, newItems)
  }

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    onUpdate(basePath, newItems)
  }

  const handleAddItem = () => {
    onUpdate(basePath, [...items, ''])
  }

  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            position: 'relative',
            group: 'item',
          }}
          className="editable-list-item"
        >
          {renderPrefix ? (
            renderPrefix(i)
          ) : bulletIcon ? (
            <span style={{ color: bulletColor || COLORS.accent, fontSize: 14, marginTop: 2, flexShrink: 0 }}>
              {bulletIcon}
            </span>
          ) : null}

          <div style={{ flex: 1 }}>
            <EditableText
              value={item}
              originalValue={originalItems[i]}
              path={[...basePath, i]}
              etapaId={etapaId}
              onUpdate={(_, value) => handleUpdateItem(i, null, value)}
              as={itemAs}
              style={itemStyle}
              multiline={false}
            />
          </div>

          <button
            type="button"
            onClick={() => handleRemoveItem(i)}
            className="editable-list-remove"
            style={{
              opacity: 0,
              position: 'absolute',
              top: 2,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: `1px solid ${COLORS.danger}40`,
              background: `${COLORS.danger}15`,
              color: COLORS.danger,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.15s',
            }}
            title="Remover item"
          >
            ×
          </button>

          <style>{`
            .editable-list-item:hover .editable-list-remove {
              opacity: 1 !important;
            }
          `}</style>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddItem}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.textDim,
          background: 'transparent',
          border: `1px dashed ${COLORS.border}`,
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          marginTop: 8,
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
        {addLabel}
      </button>
    </div>
  )
}
