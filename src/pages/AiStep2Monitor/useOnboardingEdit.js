import { useCallback, useState } from 'react'
import { adminFetch, AdminEdgeError } from '../../lib/admin-edge'

function toErrorMessage(err, fallback = 'Erro inesperado.') {
  if (err instanceof AdminEdgeError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function useOnboardingEdit({ compraId, jobId, onMutated } = {}) {
  const [savingField, setSavingField] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [busyLogoId, setBusyLogoId] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [lastError, setLastError] = useState(null)

  const invalidate = useCallback(async () => {
    if (typeof onMutated === 'function') {
      await onMutated()
    }
  }, [onMutated])

  const saveIdentityField = useCallback(
    async (field, value, options = {}) => {
      if (!compraId) return { ok: false, message: 'compra_id ausente.' }
      setSavingField(field)
      setLastError(null)
      try {
        const payload = {
          compra_id: compraId,
          changes: { [field]: value },
        }
        if (options.reenrich && (field === 'site_url' || field === 'instagram_handle')) {
          payload.reenrich = true
        }
        const res = await adminFetch('admin-update-onboarding-identity', {
          method: 'POST',
          body: payload,
        })
        await invalidate()
        return { ok: true, data: res }
      } catch (err) {
        const message = toErrorMessage(err, 'Falha ao salvar campo.')
        setLastError({ field, message, code: err?.code })
        return { ok: false, message, code: err?.code }
      } finally {
        setSavingField('')
      }
    },
    [compraId, invalidate],
  )

  const saveIdentityChanges = useCallback(
    async (changes, options = {}) => {
      if (!compraId) return { ok: false, message: 'compra_id ausente.' }
      setSavingField('bulk')
      setLastError(null)
      try {
        const payload = { compra_id: compraId, changes }
        if (options.reenrich) payload.reenrich = true
        const res = await adminFetch('admin-update-onboarding-identity', {
          method: 'POST',
          body: payload,
        })
        await invalidate()
        return { ok: true, data: res }
      } catch (err) {
        const message = toErrorMessage(err, 'Falha ao salvar campos.')
        setLastError({ field: 'bulk', message, code: err?.code })
        return { ok: false, message, code: err?.code }
      } finally {
        setSavingField('')
      }
    },
    [compraId, invalidate],
  )

  const uploadLogo = useCallback(
    async (file) => {
      if (!compraId) return { ok: false, message: 'compra_id ausente.' }
      if (!file) return { ok: false, message: 'Arquivo ausente.' }
      setUploadingLogo(true)
      setLastError(null)
      try {
        const form = new FormData()
        form.append('compra_id', compraId)
        form.append('file', file)
        const res = await adminFetch('admin-upload-logo', {
          method: 'POST',
          body: form,
          isMultipart: true,
        })
        await invalidate()
        return { ok: true, data: res }
      } catch (err) {
        const message = toErrorMessage(err, 'Falha ao enviar logo.')
        setLastError({ field: 'logo_upload', message, code: err?.code })
        return { ok: false, message, code: err?.code }
      } finally {
        setUploadingLogo(false)
      }
    },
    [compraId, invalidate],
  )

  const setActiveLogo = useCallback(
    async (historyId) => {
      if (!compraId || !historyId) return { ok: false, message: 'params invalidos.' }
      setBusyLogoId(historyId)
      setLastError(null)
      try {
        const res = await adminFetch('admin-set-active-logo', {
          method: 'POST',
          body: { compra_id: compraId, logo_history_id: historyId },
        })
        await invalidate()
        return { ok: true, data: res }
      } catch (err) {
        const message = toErrorMessage(err, 'Falha ao ativar logo.')
        setLastError({ field: 'logo_activate', message, code: err?.code })
        return { ok: false, message, code: err?.code }
      } finally {
        setBusyLogoId('')
      }
    },
    [compraId, invalidate],
  )

  const deleteLogoFromHistory = useCallback(
    async (historyId) => {
      if (!compraId || !historyId) return { ok: false, message: 'params invalidos.' }
      setBusyLogoId(historyId)
      setLastError(null)
      try {
        const res = await adminFetch('admin-delete-logo-from-history', {
          method: 'POST',
          body: { compra_id: compraId, logo_history_id: historyId },
        })
        await invalidate()
        return { ok: true, data: res }
      } catch (err) {
        const message = toErrorMessage(err, 'Falha ao deletar logo.')
        setLastError({ field: 'logo_delete', message, code: err?.code })
        return { ok: false, message, code: err?.code }
      } finally {
        setBusyLogoId('')
      }
    },
    [compraId, invalidate],
  )

  const regenerateJobs = useCallback(async () => {
    if (!jobId) return { ok: false, message: 'job_id ausente.' }
    setRegenerating(true)
    setLastError(null)
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${baseUrl}/functions/v1/retry-ai-campaign-assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ job_id: jobId, mode: 'all' }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao regenerar jobs.')
      }
      await invalidate()
      return { ok: true, data: payload }
    } catch (err) {
      const message = toErrorMessage(err, 'Falha ao regenerar jobs.')
      setLastError({ field: 'regenerate', message })
      return { ok: false, message }
    } finally {
      setRegenerating(false)
    }
  }, [jobId, invalidate])

  return {
    savingField,
    uploadingLogo,
    busyLogoId,
    regenerating,
    lastError,
    saveIdentityField,
    saveIdentityChanges,
    uploadLogo,
    setActiveLogo,
    deleteLogoFromHistory,
    regenerateJobs,
  }
}
