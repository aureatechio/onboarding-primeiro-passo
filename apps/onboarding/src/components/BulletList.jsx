import Icon from './Icon'
import { COLORS } from '../theme/colors'

export default function BulletList({ items, color, iconSize = 14, itemColor = COLORS.textMuted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon
            name="chevronRight"
            size={iconSize}
            color={color}
            strokeWidth={2.5}
            className=""
          />
          <span style={{ color: itemColor, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
