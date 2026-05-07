import { useState } from 'react'
import { Save, UserCircle } from 'lucide-react'
import { DashboardButton, DashboardField, InlineNotice } from '../components/dashboard'
import { useAuth } from '../context/AuthContext'
import { getAuthClient } from '../lib/auth-client'
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
      const authClient = getAuthClient()
      if (!authClient) throw new Error('Autenticacao nao configurada')
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
          <DashboardField label="Nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <DashboardField label="E-mail" value={user?.email || ''} disabled style={{ opacity: 0.72 }} />
          <DashboardField label="Role" value={role || 'viewer'} disabled style={{ opacity: 0.72 }} />
          {message && <InlineNotice tone="success">{message}</InlineNotice>}
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          <DashboardButton type="submit" disabled={saving} icon={Save} variant="primary" style={{ justifySelf: 'start' }}>
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </DashboardButton>
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
