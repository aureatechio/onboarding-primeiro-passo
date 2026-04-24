import { useEffect, useState } from 'react'
import { monitorTheme } from '../../theme'
import EditableField from './EditableField'

const ACELERAI_BLUE = '#384ffe'
const SANS = "'Inter', system-ui, sans-serif"

export default function SiteInstagramEditor({
  siteUrl,
  instagramHandle,
  onSave,
  saving = false,
  fieldErrors = {},
}) {
  const [reenrich, setReenrich] = useState(false)

  useEffect(() => {
    // reset after a save completes
    if (!saving) return
  }, [saving])

  const wrapSave = (field) => async (value) => {
    const res = await onSave?.(field, value, { reenrich })
    if (res?.ok && reenrich) setReenrich(false)
    return res
  }

  return (
    <div>
      <EditableField
        label="Site"
        value={siteUrl || ''}
        onSave={wrapSave('site_url')}
        placeholder="https://exemplo.com"
        saving={saving}
        error={fieldErrors.site_url}
        help="Inclua https://"
        maxLength={500}
      />
      <EditableField
        label="Instagram"
        value={instagramHandle || ''}
        onSave={wrapSave('instagram_handle')}
        placeholder="usuario (sem @)"
        saving={saving}
        error={fieldErrors.instagram_handle}
        help="Letras, numeros, ponto e underline"
        maxLength={30}
      />

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: `${ACELERAI_BLUE}14`,
          border: `1px solid ${ACELERAI_BLUE}55`,
          borderRadius: 8,
          fontFamily: SANS,
          fontSize: 12,
          color: monitorTheme.textPrimary,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={reenrich}
          onChange={(e) => setReenrich(e.target.checked)}
          style={{ marginTop: 2, accentColor: ACELERAI_BLUE }}
        />
        <span>
          Re-enriquecer briefing apos salvar
          <span style={{ display: 'block', color: monitorTheme.textMuted, marginTop: 2, fontSize: 11 }}>
            Dispara onboarding-enrichment em background quando site/instagram mudarem.
          </span>
        </span>
      </label>
    </div>
  )
}
