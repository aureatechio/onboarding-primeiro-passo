import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Edit3, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { DashboardButton, DashboardField, InlineNotice } from '../../components/dashboard'
import { adminFetch } from '../../lib/admin-edge'
import { TYPE, designTokens } from '../../theme/design-tokens'
import MonitorLayout from '../AiStep2Monitor/MonitorLayout'
import { monitorRadius, monitorTheme } from '../AiStep2Monitor/theme'
import EditUserModal from './EditUserModal'
import InviteUserModal from './InviteUserModal'

const ROLE_LABELS = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' }
const STATUS_LABELS = { active: 'Ativo', disabled: 'Desativado' }
const ROLE_BADGE_TONES = { admin: 'warning', operator: 'info', viewer: 'neutral' }
const STATUS_BADGE_TONES = { active: 'success', disabled: 'danger' }
const EMPTY_SUMMARY = {
  total: 0,
  roles: { admin: 0, operator: 0, viewer: 0 },
  status: { active: 0, disabled: 0 },
}

function toPage(value) {
  return Math.max(parseInt(value || '1', 10) || 1, 1)
}

function toLimit(value) {
  return Math.min(Math.max(parseInt(value || '20', 10) || 20, 1), 100)
}

export default function UsersList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 })
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const filters = {
    search: searchParams.get('search') || '',
    role: searchParams.get('role') || '',
    status: searchParams.get('status') || '',
  }
  const currentPage = toPage(searchParams.get('page'))
  const currentLimit = toLimit(searchParams.get('limit'))

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(currentPage))
    params.set('limit', String(currentLimit))
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)
    return params.toString()
  }, [currentLimit, currentPage, filters.role, filters.search, filters.status])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch(`list-users?${query}`, { method: 'GET' })
      setUsers(data.users || [])
      setPagination((prev) => ({ ...prev, ...(data.pagination || {}) }))
      setSummary(normalizeSummary(data.summary, data.pagination?.total))
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
    const next = new URLSearchParams(searchParams)
    next.set('page', '1')
    next.set('limit', String(currentLimit))
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
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
            <DashboardButton type="button" onClick={fetchUsers} icon={RefreshCw} variant="secondary" size="lg">
              Atualizar
            </DashboardButton>
            <DashboardButton type="button" onClick={() => setInviteOpen(true)} icon={Plus} variant="primary" size="lg">
              Convidar
            </DashboardButton>
          </div>
        </header>

        <section style={toolbarStyle}>
          <DashboardField
            label="Buscar"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            style={{ paddingLeft: 34 }}
            containerStyle={{ position: 'relative' }}
          />
          <Search size={15} color={monitorTheme.textMuted} style={{ position: 'absolute', marginTop: 33, marginLeft: 12 }} />
          <DashboardField
            as="select"
            label="Role"
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            options={[
              { value: '', label: 'Todos os roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'operator', label: 'Operator' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <DashboardField
            as="select"
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'active', label: 'Ativos' },
              { value: 'disabled', label: 'Desativados' },
            ]}
          />
        </section>

        <section aria-label="Contadores de usuarios" style={summaryGridStyle}>
          <SummaryItem label="Total" value={summary.total || pagination.total} tone="neutral" />
          <SummaryItem label="Ativos" value={summary.status.active} tone="success" />
          <SummaryItem label="Desativados" value={summary.status.disabled} tone="danger" />
          <SummaryItem label="Admins" value={summary.roles.admin} tone="warning" />
          <SummaryItem label="Operadores" value={summary.roles.operator} tone="info" />
          <SummaryItem label="Viewers" value={summary.roles.viewer} tone="neutral" />
        </section>

        {error && <InlineNotice tone="error">{error}</InlineNotice>}

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
                  <td style={tdStyle}>
                    <Badge tone={ROLE_BADGE_TONES[user.role]}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </td>
                  <td style={tdStyle}>
                    <Badge tone={STATUS_BADGE_TONES[user.status]}>
                      {STATUS_LABELS[user.status] || user.status}
                    </Badge>
                  </td>
                  <td style={tdStyle}>{formatDate(user.last_sign_in_at)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <DashboardButton type="button" onClick={() => setEditingUser(user)} variant="icon" size="sm" aria-label="Editar usuário">
                      <Edit3 size={14} />
                    </DashboardButton>
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

function normalizeSummary(summary, fallbackTotal = 0) {
  return {
    total: Number(summary?.total ?? fallbackTotal ?? 0),
    roles: {
      admin: Number(summary?.roles?.admin ?? 0),
      operator: Number(summary?.roles?.operator ?? 0),
      viewer: Number(summary?.roles?.viewer ?? 0),
    },
    status: {
      active: Number(summary?.status?.active ?? 0),
      disabled: Number(summary?.status?.disabled ?? 0),
    },
  }
}

function SummaryItem({ label, value, tone }) {
  const palette = getBadgePalette(tone)

  return (
    <div style={{
      background: monitorTheme.surfaceSubtle,
      border: `1px solid ${monitorTheme.border}`,
      borderRadius: monitorRadius.md,
      padding: '12px 14px',
      minWidth: 0,
    }}>
      <p style={{
        ...TYPE.caption,
        color: monitorTheme.textMuted,
        margin: 0,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <strong style={{
        color: palette.color,
        display: 'block',
        fontSize: 22,
        lineHeight: 1.1,
        marginTop: 6,
      }}>
        {value}
      </strong>
    </div>
  )
}

function getBadgePalette(tone) {
  const paletteByTone = {
    success: {
      bg: monitorTheme.successBg,
      border: monitorTheme.successBorder,
      color: monitorTheme.successText,
    },
    warning: {
      bg: monitorTheme.warningBg,
      border: monitorTheme.warningBorder,
      color: monitorTheme.warningText,
    },
    info: {
      bg: monitorTheme.infoBg,
      border: monitorTheme.infoBorder,
      color: monitorTheme.infoText,
    },
    danger: {
      bg: monitorTheme.dangerBg,
      border: monitorTheme.dangerBorder,
      color: monitorTheme.dangerTextStrong,
    },
    neutral: {
      bg: monitorTheme.neutralBadgeBg,
      border: monitorTheme.borderStrong,
      color: monitorTheme.neutralBadgeText,
    },
  }
  return paletteByTone[tone] || paletteByTone.neutral
}

function Badge({ children, tone }) {
  const palette = getBadgePalette(tone)

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: monitorRadius.pill,
      padding: '4px 8px',
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
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
  position: 'relative',
}
const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
}
const tableWrapStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  overflowX: 'auto',
  overflowY: 'hidden',
  background: monitorTheme.cardMutedBg,
}
const tableStyle = { width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }
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
