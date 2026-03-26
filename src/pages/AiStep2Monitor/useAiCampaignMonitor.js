import { useCallback, useEffect, useMemo, useState } from 'react'

function toPage(value, fallback) {
  return Math.max(parseInt(value || String(fallback), 10) || fallback, 1)
}

function toLimit(value, fallback) {
  return Math.min(Math.max(parseInt(value || String(fallback), 10) || fallback, 1), 100)
}

export function useAiCampaignMonitor() {
  const [locationSearch, setLocationSearch] = useState(window.location.search)
  const params = useMemo(() => new URLSearchParams(locationSearch), [locationSearch])

  const compraId = params.get('compra_id') || ''
  const jobId = params.get('job_id') || ''
  const modeParam = (params.get('mode') || '').toLowerCase()
  const isListMode = (!compraId && !jobId && modeParam !== 'detail') || modeParam === 'list'
  const listPage = toPage(params.get('page'), 1)
  const listLimit = toLimit(params.get('limit'), 20)
  const listStatus = params.get('status') || ''
  const listQuery = params.get('q') || ''
  const listCelebrity = params.get('celebrity') || ''

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const baseUrl = import.meta.env.VITE_SUPABASE_URL || ''

  const setSearchParams = useCallback((updater) => {
    const nextParams = new URLSearchParams(window.location.search)
    updater(nextParams)
    const nextSearch = nextParams.toString()
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
    window.history.pushState({}, '', nextUrl)
    setLocationSearch(window.location.search)
  }, [])

  useEffect(() => {
    const onPopState = () => setLocationSearch(window.location.search)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!baseUrl) {
        setError('VITE_SUPABASE_URL nao configurada.')
        setLoading(false)
        return
      }
      if (!isListMode && !compraId && !jobId) {
        setError('Informe compra_id ou job_id na URL.')
        setLoading(false)
        return
      }

      if (!silent) setLoading(true)
      if (silent) setRefreshing(true)

      try {
        const query = new URLSearchParams()
        if (isListMode) {
          query.set('mode', 'list')
          query.set('page', String(listPage))
          query.set('limit', String(listLimit))
          if (listStatus) query.set('status', listStatus)
          if (listQuery) query.set('q', listQuery)
        } else {
          if (compraId) query.set('compra_id', compraId)
          if (jobId) query.set('job_id', jobId)
        }

        const response = await fetch(`${baseUrl}/functions/v1/get-ai-campaign-monitor?${query.toString()}`)
        const payload = await response.json()

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Falha ao carregar monitor.')
        }

        setData(payload)
        setError('')
        setLastUpdatedAt(new Date().toISOString())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro inesperado.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [baseUrl, compraId, isListMode, jobId, listLimit, listPage, listQuery, listStatus]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!data) return undefined
    const status = data?.job?.status
    const intervalMs = isListMode
      ? 15000
      : status === 'processing' || status === 'pending'
        ? 3000
        : 15000
    const intervalId = window.setInterval(() => fetchData({ silent: true }), intervalMs)
    return () => window.clearInterval(intervalId)
  }, [data, fetchData, isListMode])

  const updateListFilters = useCallback(
    (patch) => {
      setSearchParams((next) => {
        next.set('mode', 'list')
        if (patch.page !== undefined) next.set('page', String(Math.max(1, patch.page)))
        if (patch.limit !== undefined) next.set('limit', String(toLimit(String(patch.limit), 20)))
        if (patch.status !== undefined) {
          if (patch.status) next.set('status', patch.status)
          else next.delete('status')
        }
        if (patch.q !== undefined) {
          if (patch.q) next.set('q', patch.q)
          else next.delete('q')
        }
        if (patch.celebrity !== undefined) {
          if (patch.celebrity) next.set('celebrity', patch.celebrity)
          else next.delete('celebrity')
        }
      })
    },
    [setSearchParams]
  )

  const openJobDetail = useCallback(
    (selectedJobId) => {
      setSearchParams((next) => {
        next.set('job_id', selectedJobId)
        next.delete('compra_id')
        next.delete('mode')
        next.delete('page')
        next.delete('limit')
        next.delete('status')
        next.delete('q')
        next.delete('celebrity')
      })
    },
    [setSearchParams]
  )

  const backToList = useCallback(() => {
    setSearchParams((next) => {
      next.delete('job_id')
      next.delete('compra_id')
      next.set('mode', 'list')
      if (!next.get('page')) next.set('page', '1')
      if (!next.get('limit')) next.set('limit', '20')
    })
  }, [setSearchParams])

  const goHome = useCallback(() => {
    setSearchParams((next) => {
      next.delete('job_id')
      next.delete('compra_id')
      next.delete('page')
      next.delete('limit')
      next.delete('status')
      next.delete('q')
      next.delete('celebrity')
      next.set('mode', 'list')
    })
  }, [setSearchParams])

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    compraId,
    jobId,
    isListMode,
    listPage,
    listStatus,
    listQuery,
    listCelebrity,
    updateListFilters,
    openJobDetail,
    backToList,
    goHome,
    reload: fetchData,
  }
}
