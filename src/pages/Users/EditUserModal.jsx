import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { adminFetch } from '../../lib/admin-edge'
import { useAuth } from '../../context/AuthContext'
import { monitorRadius, monitorTheme } from '../AiStep2Monitor/theme'

const ROLES = ['admin', 'operator', 'viewer']

export default function EditUserModal({ user, onClose, onSaved }) {
  const { user: currentUser } = useAuth()
  const [role, setRole] = useState(user.role)
  const [status, setStatus] = useState(user.status)
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isSelf = currentUser?.id === user.id

  async function saveChanges() {
    setSaving(true)
    setError('')
    try {
      if (role !== user.role) {
        await adminFetch('update-user-role', { method: 'POST', body: { user_id: user.id, role } })
      }
      if (status !== user.status) {
        await adminFetch('set-user-status', { method: 'POST', body: { user_id: user.id, status } })
      }
      await onSaved?.()
      onClose()
    } catch (err) {
      setError(err?.message || 'Nao foi possivel salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser() {
    if (confirmText !== user.email) return
    setSaving(true)
    setError('')
    try {
      await adminFetch('delete-user', { method: 'POST', body: { user_id: user.id } })
      await onSaved?.()
      onClose()
    } catch (err) {
      setError(err?.message || 'Nao foi possivel excluir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={titleStyle}>{user.full_name || user.email}</h2>
            <p style={subtitleStyle}>{user.email}</p>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Fechar">
            <X size={16} />
          </button>
        </header>

        <label style={fieldStyle}>
          <span style={labelStyle}>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
        </label>

        <section style={dangerZoneStyle}>
          <div>
            <strong style={{ color: monitorTheme.dangerTextStrong, fontSize: 13 }}>Excluir usuario</strong>
            <p style={subtitleStyle}>Digite o email para confirmar. Esta acao remove a conta do Auth.</p>
          </div>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isSelf}
            placeholder={isSelf ? 'Auto-exclusao bloqueada' : user.email}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={deleteUser}
            disabled={isSelf || confirmText !== user.email || saving}
            style={dangerButtonStyle}
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </section>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
          <button type="button" onClick={saveChanges} disabled={saving} style={primaryButtonStyle}>
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>
      </div>
    </div>
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
  maxWidth: 480,
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
const fieldStyle = { display: 'grid', gap: 6 }
const labelStyle = { color: monitorTheme.textSecondary, fontSize: 11, textTransform: 'uppercase' }
const inputStyle = {
  background: monitorTheme.controlBg,
  border: `1px solid ${monitorTheme.controlBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.controlText,
  padding: '10px 12px',
  font: 'inherit',
}
const dangerZoneStyle = {
  border: `1px solid ${monitorTheme.dangerBorder}`,
  borderRadius: monitorRadius.lg,
  padding: 14,
  display: 'grid',
  gap: 10,
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
const dangerButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: monitorTheme.dangerBorder,
  color: monitorTheme.dangerTextStrong,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}
const iconButtonStyle = { ...secondaryButtonStyle, padding: 8, height: 34, width: 34 }
