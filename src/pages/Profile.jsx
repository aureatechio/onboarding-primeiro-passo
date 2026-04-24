import { useState } from 'react'
import { Save, UserCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authClient } from '../lib/auth-client'
import { TYPE } from '../theme/design-tokens'
import MonitorLayout from './AiStep2Monitor/MonitorLayout'
import { monitorRadius, monitorTheme } from './AiStep2Monitor/theme'

export default function Profile() {
  const { profile, role, user, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { error: updateError } = await authClient
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
      if (updateError) throw updateError
      await refreshProfile()
      setMessage('Perfil atualizado.')
    } catch (err) {
      setError(err?.message || 'Nao foi possivel atualizar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MonitorLayout>
      <div style={{ maxWidth: 620, display: 'grid', gap: 18 }}>
        <header>
          <h1 style={{ ...TYPE.h2, color: monitorTheme.textPrimary, margin: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
            <UserCircle size={24} />
            Meu Perfil
          </h1>
          <p style={{ ...TYPE.bodySmall, color: monitorTheme.textSecondary, margin: '6px 0 0' }}>
            Dados basicos da sua conta no dashboard.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={cardStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Nome</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.72 }} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Role</span>
            <input value={role || 'viewer'} disabled style={{ ...inputStyle, opacity: 0.72 }} />
          </label>
          {message && <div style={successStyle}>{message}</div>}
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" disabled={saving} style={buttonStyle}>
            <Save size={15} />
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </MonitorLayout>
  )
}

const cardStyle = {
  background: monitorTheme.cardMutedBg,
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: 22,
  display: 'grid',
  gap: 16,
}
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
const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  justifySelf: 'start',
  background: '#384ffe',
  border: 'none',
  borderRadius: monitorRadius.md,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  padding: '10px 14px',
}
const successStyle = {
  background: monitorTheme.completedBg,
  border: '1px solid rgba(63,185,80,0.24)',
  borderRadius: monitorRadius.md,
  color: monitorTheme.completedText,
  padding: 10,
  fontSize: 12,
}
const errorStyle = {
  background: monitorTheme.dangerBg,
  border: `1px solid ${monitorTheme.dangerBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.dangerTextStrong,
  padding: 10,
  fontSize: 12,
}
