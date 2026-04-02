import { AlertTriangle } from 'lucide-react'
import Icon from './Icon'
import { COLORS } from '../theme/colors'

export default function AlertBox({ icon = AlertTriangle, color = COLORS.warning, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <Icon icon={icon} size={16} color={color} strokeWidth={2.5} />
      <p style={{ color, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{children}</p>
    </div>
  )
}
