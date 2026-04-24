import { useState } from 'react'
import { X } from 'lucide-react'
import { adminFetch } from '../../lib/admin-edge'
import { monitorRadius, monitorTheme } from '../AiStep2Monitor/theme'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
]

export default function InviteUserModal({ onClose, onInvited }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'viewer' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await adminFetch('invite-user', { method: 'POST', body: form })
      await onInvited?.()
      onClose()
    } catch (err) {
      setError(err?.message || 'Nao foi possivel enviar convite.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Convidar usuario</h2>
            <p style={subtitleStyle}>O convite sera enviado pelo Supabase Auth.</p>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Fechar">
            <X size={16} />
          </button>
        </header>

        <Field label="Nome">
          <input
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Role">
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            style={inputStyle}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </Field>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: monitorTheme.textSecondary, fontSize: 11, textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(1,4,9,0.78)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 100,
}

const modalStyle = {
  width: '100%',
  maxWidth: 440,
  background: monitorTheme.cardMutedBg,
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: 22,
  display: 'grid',
  gap: 16,
}

const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 16 }
const titleStyle = { margin: 0, color: monitorTheme.textPrimary, fontSize: 18 }
const subtitleStyle = { margin: '4px 0 0', color: monitorTheme.textSecondary, fontSize: 12 }
const inputStyle = {
  background: monitorTheme.controlBg,
  border: `1px solid ${monitorTheme.controlBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.controlText,
  padding: '10px 12px',
  font: 'inherit',
}
const errorStyle = {
  background: monitorTheme.dangerBg,
  border: `1px solid ${monitorTheme.dangerBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.dangerTextStrong,
  padding: 10,
  fontSize: 12,
}
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10 }
const primaryButtonStyle = {
  background: '#384ffe',
  border: 'none',
  borderRadius: monitorRadius.md,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  padding: '10px 14px',
}
const secondaryButtonStyle = {
  background: 'transparent',
  border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.buttonSecondaryText,
  cursor: 'pointer',
  fontWeight: 700,
  padding: '10px 14px',
}
const iconButtonStyle = { ...secondaryButtonStyle, padding: 8, height: 34, width: 34 }
