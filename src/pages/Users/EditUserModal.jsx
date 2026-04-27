import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { DashboardButton, DashboardField, DashboardModal, InlineNotice } from '../../components/dashboard'
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
    <DashboardModal isOpen title={user.full_name || user.email} onClose={onClose} closeDisabled={saving} maxWidth={480}>
      <div style={modalStyle}>
        <p style={subtitleStyle}>{user.email}</p>

        <DashboardField
          as="select"
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLES.map((item) => ({ value: item, label: item }))}
        />

        <DashboardField
          as="select"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'active', label: 'active' },
            { value: 'disabled', label: 'disabled' },
          ]}
        />

        <section style={dangerZoneStyle}>
          <div>
            <strong style={{ color: monitorTheme.dangerTextStrong, fontSize: 13 }}>Excluir usuário</strong>
            <p style={subtitleStyle}>Digite o e-mail para confirmar. Esta ação remove a conta do Auth.</p>
          </div>
          <DashboardField
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isSelf}
            placeholder={isSelf ? 'Autoexclusão bloqueada' : user.email}
          />
          <DashboardButton
            type="button"
            onClick={deleteUser}
            disabled={isSelf || confirmText !== user.email || saving}
            variant="danger"
            icon={Trash2}
          >
            Excluir
          </DashboardButton>
        </section>

        {error && <InlineNotice tone="error">{error}</InlineNotice>}

        <div style={footerStyle}>
          <DashboardButton type="button" onClick={onClose} disabled={saving} variant="secondary">Cancelar</DashboardButton>
          <DashboardButton type="button" onClick={saveChanges} disabled={saving} variant="primary">
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </DashboardButton>
        </div>
      </div>
    </DashboardModal>
  )
}

const modalStyle = {
  padding: 22,
  display: 'grid',
  gap: 16,
}
const subtitleStyle = { margin: '0', color: monitorTheme.textSecondary, fontSize: 12 }
const dangerZoneStyle = {
  border: `1px solid ${monitorTheme.dangerBorder}`,
  borderRadius: monitorRadius.lg,
  padding: 14,
  display: 'grid',
  gap: 10,
}
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10 }
