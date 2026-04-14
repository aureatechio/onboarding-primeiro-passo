import { COLORS } from '../../theme/colors'
import EditableText from './EditableText'

/**
 * EditableObjectList — Renderiza array de objetos com edicao inline.
 * Cada objeto renderiza seus campos como EditableText.
 * O layout de cada item e controlado por `renderItem` callback.
 */
export default function EditableObjectList({
  items = [],
  originalItems = [],
  basePath,
  etapaId,
  onUpdate,
  renderItem,
  addLabel = '+ Adicionar item',
  addTemplate = {},
}) {
  const handleUpdateField = (index, fieldName, value) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item
      return { ...item, [fieldName]: value }
    })
    onUpdate(basePath, newItems)
  }

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    onUpdate(basePath, newItems)
  }

  const handleAddItem = () => {
    onUpdate(basePath, [...items, { ...addTemplate }])
  }

  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ position: 'relative' }}
          className="editable-obj-item"
        >
          {renderItem({
            item,
            originalItem: originalItems[i] || {},
            index: i,
            etapaId,
            onUpdateField: (fieldName, _path, value) => handleUpdateField(i, fieldName, value),
            itemPath: [...basePath, i],
          })}

          <button
            type="button"
            onClick={() => handleRemoveItem(i)}
            className="editable-obj-remove"
            style={{
              opacity: 0,
              position: 'absolute',
              top: 4,
              right: 4,
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
              zIndex: 2,
            }}
            title="Remover item"
          >
            ×
          </button>

          <style>{`
            .editable-obj-item:hover .editable-obj-remove {
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
