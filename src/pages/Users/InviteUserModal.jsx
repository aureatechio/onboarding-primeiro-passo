import { useState } from 'react'
import { DashboardButton, DashboardField, DashboardModal, InlineNotice } from '../../components/dashboard'
import { adminFetch } from '../../lib/admin-edge'

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
    <DashboardModal isOpen title="Convidar usuário" onClose={onClose} closeDisabled={submitting} maxWidth={440}>
      <form onSubmit={handleSubmit} style={{ padding: 22, display: 'grid', gap: 16 }}>
        <p style={subtitleStyle}>O convite será enviado pelo Supabase Auth.</p>

        <DashboardField
          label="Nome"
          value={form.full_name}
          onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
          required
        />

        <DashboardField
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          required
        />

        <DashboardField
          as="select"
          label="Role"
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          options={ROLES}
        />

        {error && <InlineNotice tone="error">{error}</InlineNotice>}

        <div style={footerStyle}>
          <DashboardButton type="button" onClick={onClose} disabled={submitting} variant="secondary">Cancelar</DashboardButton>
          <DashboardButton type="submit" disabled={submitting} variant="primary">
            {submitting ? 'Enviando…' : 'Enviar convite'}
          </DashboardButton>
        </div>
      </form>
    </DashboardModal>
  )
}

const subtitleStyle = { margin: '-4px 0 0', color: '#8B949E', fontSize: 12 }
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10 }
