import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { adminFetch } from '../../lib/admin-edge'

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
  const navigate = useNavigate()
  const routeParams = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const params = searchParams

  const compraId = params.get('compra_id') || ''
  const jobId = routeParams.jobId || params.get('job_id') || ''
  const modeParam = (params.get('mode') || '').toLowerCase()
  const isListMode = !jobId && ((!compraId && modeParam !== 'detail') || modeParam === 'list')
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
  const [savingEdits, setSavingEdits] = useState(false)

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

  const updateSearchParams = useCallback((updater) => {
    const nextParams = new URLSearchParams(searchParams)
    updater(nextParams)
    setSearchParams(nextParams)
  }, [searchParams, setSearchParams])

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
      updateSearchParams((next) => {
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
    [updateSearchParams]
  )

  const openJobDetail = useCallback(
    (selectedJobId) => {
      navigate(`/ai-step2/monitor/jobs/${encodeURIComponent(selectedJobId)}`)
    },
    [navigate]
  )

  const backToList = useCallback(() => {
    navigate('/ai-step2/monitor?mode=list&page=1&limit=20')
  }, [navigate])

  const goHome = useCallback(() => {
    navigate('/ai-step2/monitor')
  }, [navigate])

  const retryRequest = useCallback(
    async (payload) => {
      if (!baseUrl) {
        setActionError('VITE_SUPABASE_URL nao configurada.')
        return { ok: false }
      }

      try {
        setActionError('')
        setActionSuccess('')

        const result = await adminFetch('retry-ai-campaign-assets', {
          method: 'POST',
          body: payload,
        })

        if (!result?.success) {
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

  const saveOnboardingEdits = useCallback(
    async ({ identityChanges, briefingChanges }) => {
      if (!compraId || !baseUrl) return { ok: false, message: 'compra_id ausente.' }
      setSavingEdits(true)
      setActionError('')
      setActionSuccess('')
      try {
        if (identityChanges && Object.keys(identityChanges).length > 0) {
          const res = await fetch(`${baseUrl}/functions/v1/save-onboarding-identity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compra_id: compraId, ...identityChanges }),
          })
          const payload = await res.json()
          if (!res.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao salvar identidade.')
          }
        }
        if (briefingChanges?.brief_text) {
          const res = await fetch(`${baseUrl}/functions/v1/save-campaign-briefing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              compra_id: compraId,
              mode: 'text',
              text: briefingChanges.brief_text,
            }),
          })
          const payload = await res.json()
          if (!res.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao salvar briefing.')
          }
        }
        setActionSuccess('Dados salvos com sucesso.')
        await fetchData({ silent: true })
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar.'
        setActionError(message)
        return { ok: false, message }
      } finally {
        setSavingEdits(false)
      }
    },
    [compraId, baseUrl, fetchData],
  )

  const rerunAllAssets = useCallback(async () => {
    if (!jobId) return { ok: false, message: 'job_id ausente.' }
    setRetryingAll(true)
    const response = await retryRequest({ job_id: jobId, mode: 'all' })
    setRetryingAll(false)
    return response
  }, [jobId, retryRequest])

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
    availablePurchases: data?.available_purchases || [],
    savingEdits,
    saveOnboardingEdits,
    rerunAllAssets,
    releaseOnboarding: async (compraId, reasonCode, notes) => {
      if (!baseUrl) {
        setActionError('VITE_SUPABASE_URL nao configurada.')
        return { ok: false }
      }
      try {
        setActionError('')
        setActionSuccess('')
        const result = await adminFetch('set-onboarding-access', {
          method: 'POST',
          body: {
            compra_id: compraId,
            action: 'allow',
            reason_code: reasonCode || 'manual_exception',
            notes: notes || '',
          },
        })
        if (!result?.success) {
          throw new Error(result?.message || 'Falha ao liberar onboarding.')
        }
        setActionSuccess(result?.message || 'Onboarding liberado com sucesso.')
        await fetchData({ silent: true, force: true })
        return { ok: true, result }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado ao liberar.'
        setActionError(message)
        return { ok: false, message }
      }
    },
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
