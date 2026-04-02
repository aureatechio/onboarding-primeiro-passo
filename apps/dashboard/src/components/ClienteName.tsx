import { CRM_LEAD_URL } from '@/lib/constants'

interface ClienteNameProps {
  nome: string | null
  leadId: string | null
  className?: string
}

/**
 * Exibe o nome do cliente: clicável (link para o lead no CRM) quando lead_id existe,
 * texto cinza e não clicável quando lead_id é null.
 */
export function ClienteName({ nome, leadId, className = '' }: ClienteNameProps) {
  const display = nome ?? '—'
  if (leadId) {
    return (
      <a
        href={`${CRM_LEAD_URL}${encodeURIComponent(leadId)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-blue-600 underline hover:text-blue-800 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {display}
      </a>
    )
  }
  return (
    <span className={`text-muted-foreground ${className}`}>{display}</span>
  )
}
