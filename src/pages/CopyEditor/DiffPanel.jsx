import { COLORS } from '../../theme/colors'
import { monitorTheme } from '../AiStep2Monitor/theme'

/**
 * Recursively collect changed string fields between current and original.
 */
function collectDiffs(current, original, path = []) {
  const diffs = []

  if (current === original) return diffs

  if (typeof current === 'string' && typeof original === 'string') {
    if (current !== original) {
      diffs.push({ path: [...path], current, original })
    }
    return diffs
  }

  if (typeof current === 'function' || typeof original === 'function') {
    return diffs
  }

  if (Array.isArray(current) && Array.isArray(original)) {
    const maxLen = Math.max(current.length, original.length)
    for (let i = 0; i < maxLen; i++) {
      diffs.push(...collectDiffs(current[i], original[i], [...path, i]))
    }
    return diffs
  }

  if (current && typeof current === 'object' && original && typeof original === 'object') {
    const allKeys = new Set([...Object.keys(current), ...Object.keys(original)])
    for (const key of allKeys) {
      diffs.push(...collectDiffs(current[key], original[key], [...path, key]))
    }
    return diffs
  }

  if (current !== original) {
    diffs.push({
      path: [...path],
      current: String(current ?? ''),
      original: String(original ?? ''),
    })
  }

  return diffs
}

export default function DiffPanel({ data, originalData, isOpen }) {
  if (!isOpen || !data || !originalData) return null

  const diffs = collectDiffs(data, originalData)

  if (diffs.length === 0) {
    return (
      <div style={{
        background: monitorTheme.cardMutedBg,
        border: `1px solid ${monitorTheme.border}`,
        borderRadius: 10,
        padding: 20,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <p style={{ color: monitorTheme.textMuted, fontSize: 13, margin: 0 }}>
          Nenhuma alteração nesta etapa.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: monitorTheme.pageBg,
      border: `1px solid ${monitorTheme.border}`,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
      maxHeight: 400,
      overflowY: 'auto',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        color: monitorTheme.textMuted,
        fontFamily: "'JetBrains Mono', monospace",
        margin: '0 0 12px 0',
      }}>
        {diffs.length} CAMPO{diffs.length > 1 ? 'S' : ''} ALTERADO{diffs.length > 1 ? 'S' : ''}
      </p>

      {diffs.map((diff, i) => {
        const pathStr = diff.path.filter((p) => typeof p === 'string').join('.')
        return (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i < diffs.length - 1 ? `1px solid ${monitorTheme.borderSoft}` : 'none',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              color: monitorTheme.textMuted,
              margin: '0 0 6px 0',
            }}>
              {pathStr || diff.path.join('.')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1,
                background: `${COLORS.danger}08`,
                border: `1px solid ${COLORS.danger}20`,
                borderRadius: 6,
                padding: '6px 8px',
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: COLORS.danger, margin: '0 0 4px 0' }}>ORIGINAL</p>
                <p style={{ fontSize: 12, color: monitorTheme.textSecondary, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {diff.original || '(vazio)'}
                </p>
              </div>
              <div style={{
                flex: 1,
                background: `${COLORS.success}08`,
                border: `1px solid ${COLORS.success}20`,
                borderRadius: 6,
                padding: '6px 8px',
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: COLORS.success, margin: '0 0 4px 0' }}>EDITADO</p>
                <p style={{ fontSize: 12, color: monitorTheme.textSecondary, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {diff.current || '(vazio)'}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
