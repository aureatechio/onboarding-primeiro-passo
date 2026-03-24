import Icon from './Icon'
import { COLORS } from '../theme/colors'
import { TYPE } from '../theme/design-tokens'

export default function InfoCard({ icon, iconColor, title, children, borderColor, bgTint }) {
  const accent = iconColor || COLORS.red

  return (
    <div
      style={{
        background: bgTint || COLORS.card,
        border: `1px solid ${borderColor || COLORS.border}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Icon icon={icon} size={20} color={accent} bg={`${accent}15`} containerSize={40} radius={12} />
        <p style={{ ...TYPE.h3, color: COLORS.text, margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  )
}
