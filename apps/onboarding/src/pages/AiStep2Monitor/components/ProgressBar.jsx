import { motion } from 'framer-motion'
import { TYPE } from '../../../theme/design-tokens'
import { monitorRadius, monitorTheme } from '../theme'

export default function ProgressBar({ percent, height = 8, showLabel = true, animated = false }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0))
  const fillStyles = {
    height: '100%',
    background: `linear-gradient(90deg, ${monitorTheme.brandGradientStart}, ${monitorTheme.brandGradientEnd})`,
    borderRadius: monitorRadius.pill,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          height,
          borderRadius: monitorRadius.pill,
          background: monitorTheme.progressTrack,
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safePercent}%` }}
            transition={{ duration: 0.45 }}
            style={fillStyles}
          />
        ) : (
          <div style={{ ...fillStyles, width: `${safePercent}%` }} />
        )}
      </div>
      {showLabel ? (
        <span style={{ ...TYPE.caption, color: monitorTheme.textMuted, whiteSpace: 'nowrap' }}>
          {safePercent}%
        </span>
      ) : null}
    </div>
  )
}
