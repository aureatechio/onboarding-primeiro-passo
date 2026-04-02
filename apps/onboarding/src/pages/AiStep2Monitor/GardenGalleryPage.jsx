import { useState, useEffect, useCallback } from 'react'
import { Download, X, ChevronLeft, ChevronRight, Zap, Sparkles, ImageOff } from 'lucide-react'
import MonitorLayout from './MonitorLayout'
import { monitorTheme, monitorRadius, monitorSpacing } from './theme'
import { TYPE } from '../../theme/design-tokens'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const PAGE_SIZE = 20

const TOOL_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'post-turbo', label: 'Post Turbo' },
  { value: 'post-gen', label: 'Post Gen' },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completados' },
  { value: 'failed', label: 'Falhos' },
  { value: 'all', label: 'Todos' },
]

const TOOL_BADGE = {
  'post-turbo': { label: 'Post Turbo', icon: Zap, bg: '#EFF6FF', color: '#1D4ED8' },
  'post-gen': { label: 'Post Gen', icon: Sparkles, bg: '#F5F3FF', color: '#6D28D9' },
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ToolBadge({ tool }) {
  const cfg = TOOL_BADGE[tool]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: monitorRadius.sm,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 600,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function FilterBar({ tool, status, onToolChange, onStatusChange }) {
  const selectStyle = {
    padding: '6px 10px', borderRadius: monitorRadius.sm,
    border: `1px solid ${monitorTheme.border}`, fontSize: 13,
    background: '#fff', color: monitorTheme.textPrimary,
    cursor: 'pointer', outline: 'none',
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ fontSize: 13, color: monitorTheme.textSecondary }}>
        Ferramenta:
        <select value={tool} onChange={(e) => onToolChange(e.target.value)} style={{ ...selectStyle, marginLeft: 6 }}>
          {TOOL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 13, color: monitorTheme.textSecondary }}>
        Status:
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} style={{ ...selectStyle, marginLeft: 6 }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </div>
  )
}

function GalleryCard({ item, onClick }) {
  const [imgError, setImgError] = useState(false)
  const isCompleted = item.status === 'completed'

  return (
    <div
      onClick={isCompleted ? () => onClick(item) : undefined}
      style={{
        borderRadius: monitorRadius.md,
        border: `1px solid ${monitorTheme.border}`,
        background: '#fff',
        overflow: 'hidden',
        cursor: isCompleted ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        if (isCompleted) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '1 / 1',
        background: monitorTheme.cardMutedBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {isCompleted && item.output_image_url && !imgError ? (
          <img
            src={item.output_image_url}
            alt={item.input_prompt?.slice(0, 60) || 'Imagem gerada'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ textAlign: 'center', color: monitorTheme.textMuted }}>
            <ImageOff size={32} style={{ opacity: 0.4 }} />
            {item.status === 'failed' && (
              <p style={{ fontSize: 11, marginTop: 4, color: monitorTheme.failedText }}>Falhou</p>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ToolBadge tool={item.tool} />
          <span style={{ fontSize: 11, color: monitorTheme.textMuted }}>{item.input_format}</span>
        </div>
        <p style={{
          ...TYPE.bodySmall, color: monitorTheme.textSecondary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
        }}>
          {item.input_prompt?.slice(0, 80) || '—'}
        </p>
        <span style={{ fontSize: 11, color: monitorTheme.textMuted }}>{formatDate(item.created_at)}</span>
      </div>
    </div>
  )
}

function Lightbox({ item, onClose }) {
  const handleDownload = async () => {
    if (!item?.output_image_url) return
    try {
      const res = await fetch(item.output_image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.tool}-${item.input_format.replace(':', 'x')}-${item.job_id.slice(0, 8)}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(item.output_image_url, '_blank')
    }
  }

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: monitorTheme.overlayBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}
      >
        <img
          src={item.output_image_url}
          alt={item.input_prompt?.slice(0, 60) || 'Imagem gerada'}
          style={{
            maxWidth: '100%', maxHeight: 'calc(90vh - 80px)',
            borderRadius: monitorRadius.md, objectFit: 'contain',
          }}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ToolBadge tool={item.tool} />
          <span style={{ fontSize: 12, color: '#CBD5E1' }}>{item.input_format}</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatDate(item.created_at)}</span>
          <button
            onClick={handleDownload}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: monitorRadius.sm,
              background: '#fff', color: monitorTheme.textPrimary,
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -12, right: -12,
            width: 32, height: 32, borderRadius: '50%',
            background: monitorTheme.overlayControlBg,
            border: `1px solid ${monitorTheme.overlayControlBorder}`,
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: monitorRadius.sm,
          border: `1px solid ${monitorTheme.border}`,
          background: page <= 1 ? monitorTheme.cardMutedBg : '#fff',
          color: page <= 1 ? monitorTheme.textMuted : monitorTheme.textPrimary,
          fontSize: 13, cursor: page <= 1 ? 'default' : 'pointer',
        }}
      >
        <ChevronLeft size={14} />
        Anterior
      </button>
      <span style={{ fontSize: 13, color: monitorTheme.textSecondary }}>
        {page} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: monitorRadius.sm,
          border: `1px solid ${monitorTheme.border}`,
          background: page >= totalPages ? monitorTheme.cardMutedBg : '#fff',
          color: page >= totalPages ? monitorTheme.textMuted : monitorTheme.textPrimary,
          fontSize: 13, cursor: page >= totalPages ? 'default' : 'pointer',
        }}
      >
        Proximo
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 16,
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: monitorRadius.md,
          border: `1px solid ${monitorTheme.borderSoft}`,
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%', aspectRatio: '1 / 1',
            background: monitorTheme.cardMutedBg,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 80, height: 18, background: monitorTheme.cardMutedBg, borderRadius: 4 }} />
            <div style={{ width: '70%', height: 14, background: monitorTheme.cardMutedBg, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GardenGalleryPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [tool, setTool] = useState('all')
  const [status, setStatus] = useState('completed')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxItem, setLightboxItem] = useState(null)

  const fetchGallery = useCallback(async (toolFilter, statusFilter, pageNum) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        tool: toolFilter,
        status: statusFilter,
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      })
      const res = await fetch(`${SUPABASE_URL}/functions/v1/list-garden-jobs?${params}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.message || 'Erro ao carregar galeria.')
        return
      }
      setItems(json.data.items)
      setTotal(json.data.total)
    } catch {
      setError('Erro de conexao ao carregar galeria.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGallery(tool, status, page)
  }, [tool, status, page, fetchGallery])

  const handleToolChange = (v) => { setTool(v); setPage(1) }
  const handleStatusChange = (v) => { setStatus(v); setPage(1) }

  return (
    <MonitorLayout>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ ...TYPE.h2, margin: 0, color: monitorTheme.textPrimary }}>Galeria</h1>
          {!loading && (
            <p style={{ ...TYPE.bodySmall, margin: '4px 0 0', color: monitorTheme.textMuted }}>
              {total} {total === 1 ? 'imagem' : 'imagens'}
            </p>
          )}
        </div>
        <FilterBar
          tool={tool}
          status={status}
          onToolChange={handleToolChange}
          onStatusChange={handleStatusChange}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: monitorRadius.sm, marginBottom: 16,
          background: monitorTheme.dangerBg, border: `1px solid ${monitorTheme.dangerBorder}`,
          color: monitorTheme.dangerText, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: monitorTheme.textMuted,
        }}>
          <ImageOff size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ ...TYPE.body, margin: 0 }}>Nenhuma imagem encontrada.</p>
          <p style={{ ...TYPE.bodySmall, margin: '4px 0 0' }}>Gere imagens no Post Turbo ou Post Gen.</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {items.map((item) => (
              <GalleryCard key={item.job_id} item={item} onClick={setLightboxItem} />
            ))}
          </div>
          <Pagination page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      )}
    </MonitorLayout>
  )
}
