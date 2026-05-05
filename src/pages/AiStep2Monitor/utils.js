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

export function getAssetStableKey(asset) {
  if (!asset) return ''
  if (asset.stableKey) return String(asset.stableKey)
  if (asset.id) return `id:${asset.id}`

  return [
    asset.job_id,
    asset.compra_id,
    asset.group_name,
    asset.format,
    asset.image_url,
    asset.storage_path,
    asset.prompt_hash,
    asset.created_at,
    asset.updated_at,
  ]
    .filter((part) => part !== undefined && part !== null && part !== '')
    .map(String)
    .join('|')
}

export function normalizeMonitorAssets(assets = []) {
  const seen = new Map()

  return assets.map((asset) => {
    const signature = getAssetStableKey(asset) || 'asset-without-stable-fields'
    const count = seen.get(signature) || 0
    seen.set(signature, count + 1)

    const stableKey = count === 0 ? signature : `${signature}#${count + 1}`
    return { ...asset, stableKey }
  })
}

export function downloadImage(url, fallbackName) {
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.download = fallbackName || 'asset.png'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    if (link.parentNode === document.body) {
      document.body.removeChild(link)
    }
  }
}
