import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { adminFetch } from '../../lib/admin-edge'
import { TYPE, designTokens } from '../../theme/design-tokens'
import MonitorLayout from '../AiStep2Monitor/MonitorLayout'
import { monitorRadius, monitorTheme } from '../AiStep2Monitor/theme'
import EditUserModal from './EditUserModal'
import InviteUserModal from './InviteUserModal'

const ROLE_LABELS = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' }
const STATUS_LABELS = { active: 'Ativo', disabled: 'Desativado' }

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 })
  const [filters, setFilters] = useState({ search: '', role: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(pagination.page))
    params.set('limit', String(pagination.limit))
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)
    return params.toString()
  }, [filters, pagination.page, pagination.limit])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch(`list-users?${query}`, { method: 'GET' })
      setUsers(data.users || [])
      setPagination((prev) => ({ ...prev, ...(data.pagination || {}) }))
    } catch (err) {
      setError(err?.message || 'Nao foi possivel listar usuarios.')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function updateFilter(key, value) {
    setPagination((prev) => ({ ...prev, page: 1 }))
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <MonitorLayout>
      <div style={{ display: 'grid', gap: 18 }}>
        <header style={headerStyle}>
          <div>
            <h1 style={{ ...TYPE.h2, color: monitorTheme.textPrimary, margin: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Users size={23} />
              Usuarios
            </h1>
            <p style={{ ...TYPE.bodySmall, color: monitorTheme.textSecondary, margin: '6px 0 0' }}>
              Convites, roles e ciclo de vida das contas do dashboard.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={fetchUsers} style={secondaryButtonStyle}>
              <RefreshCw size={15} />
              Atualizar
            </button>
            <button type="button" onClick={() => setInviteOpen(true)} style={primaryButtonStyle}>
              <Plus size={15} />
              Convidar
            </button>
          </div>
        </header>

        <section style={toolbarStyle}>
          <label style={searchStyle}>
            <Search size={15} color={monitorTheme.textMuted} />
            <input
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Buscar por nome ou email"
              style={bareInputStyle}
            />
          </label>
          <select value={filters.role} onChange={(e) => updateFilter('role', e.target.value)} style={selectStyle}>
            <option value="">Todos os roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} style={selectStyle}>
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="disabled">Desativados</option>
          </select>
        </section>

        {error && <div style={errorStyle}>{error}</div>}

        <section style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Nome', 'Email', 'Role', 'Status', 'Ultimo login', ''].map((heading) => (
                  <th key={heading} style={thStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={emptyStyle}>Carregando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" style={emptyStyle}>Nenhum usuario encontrado.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td style={tdStyle}>{user.full_name || '-'}</td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}><Badge tone="role">{ROLE_LABELS[user.role] || user.role}</Badge></td>
                  <td style={tdStyle}><Badge tone={user.status}>{STATUS_LABELS[user.status] || user.status}</Badge></td>
                  <td style={tdStyle}>{formatDate(user.last_sign_in_at)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button type="button" onClick={() => setEditingUser(user)} style={iconButtonStyle} aria-label="Editar usuario">
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {inviteOpen && <InviteUserModal onClose={() => setInviteOpen(false)} onInvited={fetchUsers} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={fetchUsers} />}
    </MonitorLayout>
  )
}

function Badge({ children, tone }) {
  const isDanger = tone === 'disabled'
  return (
    <span style={{
      display: 'inline-flex',
      borderRadius: monitorRadius.pill,
      padding: '4px 8px',
      background: isDanger ? monitorTheme.dangerBg : monitorTheme.neutralBadgeBg,
      color: isDanger ? monitorTheme.dangerTextStrong : monitorTheme.textSecondary,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {children}
    </span>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
}
const toolbarStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(240px, 1fr) 180px 180px',
  gap: 10,
}
const searchStyle = {
  background: monitorTheme.controlBg,
  border: `1px solid ${monitorTheme.controlBorder}`,
  borderRadius: monitorRadius.md,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
}
const bareInputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: monitorTheme.controlText,
  font: 'inherit',
  outline: 'none',
  padding: '10px 0',
}
const selectStyle = {
  background: monitorTheme.controlBg,
  border: `1px solid ${monitorTheme.controlBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.controlText,
  font: 'inherit',
  padding: '10px 12px',
}
const tableWrapStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  overflow: 'hidden',
  background: monitorTheme.cardMutedBg,
}
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle = {
  color: monitorTheme.textMuted,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: designTokens.space[6],
  textAlign: 'left',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${monitorTheme.border}`,
}
const tdStyle = {
  color: monitorTheme.textPrimary,
  padding: designTokens.space[6],
  borderBottom: `1px solid ${monitorTheme.borderSoft}`,
}
const emptyStyle = { ...tdStyle, color: monitorTheme.textSecondary, textAlign: 'center', padding: 30 }
const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: '#384ffe',
  border: 'none',
  borderRadius: monitorRadius.md,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  padding: '10px 14px',
}
const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'transparent',
  border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.buttonSecondaryText,
  cursor: 'pointer',
  fontWeight: 700,
  padding: '10px 14px',
}
const iconButtonStyle = { ...secondaryButtonStyle, padding: 8 }
const errorStyle = {
  background: monitorTheme.dangerBg,
  border: `1px solid ${monitorTheme.dangerBorder}`,
  borderRadius: monitorRadius.md,
  color: monitorTheme.dangerTextStrong,
  padding: 12,
  fontSize: 12,
}
