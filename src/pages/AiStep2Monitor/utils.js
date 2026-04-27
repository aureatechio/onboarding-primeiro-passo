export function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return String(value)
  }
}

export function normalizeGroupName(groupName) {
  return String(groupName || '').trim().toLowerCase()
}

export function uniqueNonEmpty(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR')
  )
}

export function resolveDetailCompraId({ urlCompraId, data, job, onboarding } = {}) {
  return (
    urlCompraId ||
    data?.input?.compra_id ||
    job?.compra_id ||
    onboarding?.compra?.id ||
    ''
  )
}

export function downloadImage(url, fallbackName) {
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.download = fallbackName || 'asset.png'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
