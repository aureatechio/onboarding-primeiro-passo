import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

function mapMethodLabel(method: string | null): string {
  if (!method) return '—'
  const normalized = method.toLowerCase()
  if (normalized === 'pix') return 'PIX'
  if (normalized === 'cartao_recorrente') return 'Cartão Recorrente'
  if (normalized.includes('cartao') || normalized.includes('card')) return 'Cartão'
  if (normalized.includes('boleto')) return 'Boleto'
  return method
}

/**
 * Given an array of split_group_ids from the current page,
 * fetches checkout_sessions for all of them in a single query
 * and returns a map: splitGroupId -> deduplicated method labels string.
 */
export function useSplitMethodsMap(splitGroupIds: string[]): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})

  const stableKey = useMemo(() => {
    const sorted = [...new Set(splitGroupIds)].sort()
    return sorted.join(',')
  }, [splitGroupIds])

  useEffect(() => {
    if (!stableKey) {
      setMap({})
      return
    }

    const uniqueIds = stableKey.split(',')

    ;(async () => {
      const { data, error } = await supabase
        .from('checkout_sessions')
        .select('split_group_id, metodo_pagamento')
        .in('split_group_id', uniqueIds)
        .order('split_index', { ascending: true, nullsFirst: false })

      if (error || !data) return

      const grouped: Record<string, Set<string>> = {}
      for (const row of data as Array<{
        split_group_id: string
        metodo_pagamento: string | null
      }>) {
        const gid = row.split_group_id
        if (!grouped[gid]) grouped[gid] = new Set()
        const label = mapMethodLabel(row.metodo_pagamento)
        if (label !== '—') grouped[gid].add(label)
      }

      const result: Record<string, string> = {}
      for (const [gid, labels] of Object.entries(grouped)) {
        result[gid] = labels.size > 0 ? Array.from(labels).join(' + ') : 'Métodos indisponíveis'
      }

      setMap(result)
    })()
  }, [stableKey])

  return map
}
