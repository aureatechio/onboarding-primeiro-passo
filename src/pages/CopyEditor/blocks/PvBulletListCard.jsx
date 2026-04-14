import { COLORS } from '../../../theme/colors'
import Icon from '../../../components/Icon'
import EditableText from '../EditableText'
import EditableList from '../EditableList'

/**
 * Preview block: Card with icon + label header, then bullet list items.
 * Used in Etapa2 slide4 (nossaParte/suaParte), Etapa3 slide3, etc.
 */
export default function PvBulletListCard({
  icon,
  iconColor,
  label,
  originalLabel,
  labelPath,
  items = [],
  originalItems = [],
  itemsPath,
  etapaId,
  onUpdate,
}) {
  const accent = iconColor || COLORS.red

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${accent}25`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={accent}
            bg={`${accent}15`}
            containerSize={40}
            radius={12}
          />
        )}
        {label && (
          <EditableText
            value={label}
            originalValue={originalLabel}
            path={labelPath}
            etapaId={etapaId}
            onUpdate={onUpdate}
            as="p"
            style={{
              color: accent,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.03em',
              margin: 0,
            }}
          />
        )}
      </div>

      <EditableList
        items={items}
        originalItems={originalItems}
        basePath={itemsPath}
        etapaId={etapaId}
        onUpdate={onUpdate}
        bulletIcon="•"
        bulletColor={accent}
        itemAs="p"
        itemStyle={{
          color: COLORS.textMuted,
          fontSize: 13,
          lineHeight: 1.6,
          margin: '4px 0',
        }}
      />
    </div>
  )
}
