import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function toPage(value, fallback) {
  return Math.max(parseInt(value || String(fallback), 10) || fallback, 1)
}

function toLimit(value, fallback) {
  return Math.min(Math.max(parseInt(value || String(fallback), 10) || fallback, 1), 100)
}

const responseCache = new Map()
const inflightByKey = new Map()
const maxCachedResponses = 25

function cacheResponse(key, payload, loadedAt) {
  if (!key) return
  responseCache.set(key, { payload, loadedAt })
  if (responseCache.size > maxCachedResponses) {
    const oldestKey = responseCache.keys().next().value
    if (oldestKey) responseCache.delete(oldestKey)
  }
}

function inDev() {
  return Boolean(import.meta.env.DEV)
}

function mark(name) {
  if (typeof performance === 'undefined') return
  performance.mark(name)
}

function measure(name, start, end) {
  if (typeof performance === 'undefined') return
  const hasStart = performance.getEntriesByName(start).length > 0
  const hasEnd = performance.getEntriesByName(end).length > 0
  if (!hasStart || !hasEnd) return
  performance.measure(name, start, end)
  const entries = performance.getEntriesByName(name)
  const duration = entries[entries.length - 1]?.duration
  if (inDev() && typeof duration === 'number') {
    console.debug(`[ai-step2-monitor][perf] ${name}: ${Math.round(duration)}ms`)
  }
}

function isAbortError(error) {
  return error instanceof Error && error.name === 'AbortError'
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
  const listCompra = params.get('compra') || ''

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [retryingAssetId, setRetryingAssetId] = useState('')
  const [retryingAll, setRetryingAll] = useState(false)
  const [retryingCategory, setRetryingCategory] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const baseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const requestIdRef = useRef(0)
  const dataRef = useRef(null)
  const activeRequestRef = useRef({ controller: null, key: '' })

  const requestKey = useMemo(() => {
    if (isListMode) {
      return `list|page=${listPage}|limit=${listLimit}|status=${listStatus}|q=${listQuery}`
    }
    return `detail|compra=${compraId}|job=${jobId}`
  }, [compraId, isListMode, jobId, listLimit, listPage, listQuery, listStatus])

  const setSearchParams = useCallback((updater) => {
    const nextParams = new URLSearchParams(window.location.search)
    updater(nextParams)
    const nextSearch = nextParams.toString()
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
    window.history.pushState({}, '', nextUrl)
    window.dispatchEvent(new Event('aurea:location-change'))
    setLocationSearch(window.location.search)
  }, [])

  useEffect(() => {
    const onPopState = () => setLocationSearch(window.location.search)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('aurea:location-change', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('aurea:location-change', onPopState)
    }
  }, [])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const fetchData = useCallback(
    async ({ silent = false, force = false } = {}) => {
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

      const cacheEntry = responseCache.get(requestKey)
      const hasVisibleData = Boolean(dataRef.current || cacheEntry?.payload)

      if (!silent && cacheEntry?.payload && !force) {
        setData(cacheEntry.payload)
        setLastUpdatedAt(cacheEntry.loadedAt)
        setError('')
        setLoading(false)
      }

      if (!silent) setLoading(!hasVisibleData)
      if (silent || hasVisibleData) setRefreshing(true)

      const currentRequestId = ++requestIdRef.current

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

        const url = `${baseUrl}/functions/v1/get-ai-campaign-monitor?${query.toString()}`
        const runFetch = async () => {
          if (activeRequestRef.current.controller && activeRequestRef.current.key !== requestKey) {
            activeRequestRef.current.controller.abort()
          }

          const controller = new AbortController()
          activeRequestRef.current = { controller, key: requestKey }
          mark('ai-step2-list-fetch-start')
          const fetchPromise = fetch(url, { signal: controller.signal })
          inflightByKey.set(requestKey, fetchPromise)
          try {
            return await fetchPromise
          } finally {
            inflightByKey.delete(requestKey)
          }
        }

        const inflightPromise = inflightByKey.get(requestKey)
        let response

        if (inflightPromise) {
          try {
            response = await inflightPromise
          } catch (inflightErr) {
            // A shared inflight request can be aborted by StrictMode remounts.
            // In this case, immediately retry with a fresh request.
            if (!isAbortError(inflightErr)) throw inflightErr
            response = await runFetch()
          }
        } else {
          response = await runFetch()
        }

        const payload = await response.json()
        mark('ai-step2-list-fetch-end')
        measure('ai-step2:list-fetch', 'ai-step2-list-fetch-start', 'ai-step2-list-fetch-end')
        measure('ai-step2:nav-to-fetch-end', 'ai-step2-nav-start', 'ai-step2-list-fetch-end')

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Falha ao carregar monitor.')
        }

        if (currentRequestId !== requestIdRef.current) {
          return
        }

        const loadedAt = new Date().toISOString()
        setData(payload)
        setError('')
        setActionError('')
        setLastUpdatedAt(loadedAt)
        cacheResponse(requestKey, payload, loadedAt)
      } catch (err) {
        if (isAbortError(err)) return
        setError(err instanceof Error ? err.message : 'Erro inesperado.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [baseUrl, compraId, isListMode, jobId, listLimit, listPage, listQuery, listStatus, requestKey]
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

  useEffect(() => {
    return () => {
      if (activeRequestRef.current.controller) {
        activeRequestRef.current.controller.abort()
      }
    }
  }, [])

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
        if (patch.compra !== undefined) {
          if (patch.compra) {
            next.set('compra', patch.compra)
            next.delete('q')
          } else {
            next.delete('compra')
          }
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
        next.delete('compra')
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
      next.delete('compra')
      next.delete('celebrity')
      next.set('mode', 'list')
    })
  }, [setSearchParams])

  const retryRequest = useCallback(
    async (payload) => {
      if (!baseUrl) {
        setActionError('VITE_SUPABASE_URL nao configurada.')
        return { ok: false }
      }

      try {
        setActionError('')
        setActionSuccess('')

        const response = await fetch(`${baseUrl}/functions/v1/retry-ai-campaign-assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Falha ao reprocessar.')
        }

        setActionSuccess(result?.message || 'Reprocessamento disparado com sucesso.')
        await fetchData({ silent: true })
        return { ok: true, result }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado ao reprocessar.'
        setActionError(message)
        return { ok: false, message }
      }
    },
    [baseUrl, fetchData]
  )

  const retrySingleAsset = useCallback(
    async (assetId) => {
      if (!jobId || !assetId) return { ok: false, message: 'job_id/asset_id ausente.' }
      setRetryingAssetId(assetId)
      const response = await retryRequest({
        job_id: jobId,
        asset_id: assetId,
        mode: 'single',
      })
      setRetryingAssetId('')
      return response
    },
    [jobId, retryRequest]
  )

  const retryFailedAssets = useCallback(async () => {
    if (!jobId) return { ok: false, message: 'job_id ausente.' }
    setRetryingAll(true)
    const response = await retryRequest({
      job_id: jobId,
      mode: 'failed',
    })
    setRetryingAll(false)
    return response
  }, [jobId, retryRequest])

  const retryCategory = useCallback(
    async (groupName) => {
      if (!jobId || !groupName) return { ok: false, message: 'job_id/group_name ausente.' }
      setRetryingCategory(groupName)
      const response = await retryRequest({
        job_id: jobId,
        mode: 'category',
        group_name: groupName,
      })
      setRetryingCategory('')
      return response
    },
    [jobId, retryRequest]
  )

  return {
    data,
    loading,
    refreshing,
    error,
    actionError,
    actionSuccess,
    retryingAssetId,
    retryingAll,
    retryingCategory,
    lastUpdatedAt,
    compraId,
    jobId,
    isListMode,
    listPage,
    listStatus,
    listQuery,
    listCelebrity,
    listCompra,
    eligiblePurchases: data?.eligible_purchases || [],
    updateListFilters,
    openJobDetail,
    backToList,
    goHome,
    reload: fetchData,
    retrySingleAsset,
    retryFailedAssets,
    retryCategory,
  }
}
