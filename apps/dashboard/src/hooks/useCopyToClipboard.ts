import { useCallback } from 'react'

function legacyCopyText(value: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  let success = false
  try {
    success = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }

  return success
}

export function useCopyToClipboard() {
  return useCallback(async (value: string): Promise<boolean> => {
    const normalized = value.trim()
    if (!normalized) {
      return false
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(normalized)
        return true
      } catch {
        return legacyCopyText(normalized)
      }
    }

    return legacyCopyText(normalized)
  }, [])
}
