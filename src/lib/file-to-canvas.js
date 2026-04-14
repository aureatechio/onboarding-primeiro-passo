const MAX_DIMENSION = 200

function loadImageToCanvas(file, maxDim = MAX_DIMENSION) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

async function loadPdfToCanvas(file, maxDim = MAX_DIMENSION) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const unscaledViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(1, maxDim / Math.max(unscaledViewport.width, unscaledViewport.height))
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')

  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

/**
 * Converts any supported file (image, PDF, SVG) to a canvas element.
 * Returns the canvas or null if the format is unsupported/failed.
 */
export async function fileToCanvas(file, maxDim = MAX_DIMENSION) {
  if (!file) return null

  const ext = (file.name || '').split('.').pop()?.toLowerCase()
  const isPdf = file.type === 'application/pdf' || ext === 'pdf'

  if (isPdf) {
    try {
      return await loadPdfToCanvas(file, maxDim)
    } catch (err) {
      console.warn('[file-to-canvas] PDF rasterization failed:', err)
      return null
    }
  }

  // SVG, raster images (PNG/JPG/WebP), and HEIC (Safari only) all go through <img>
  try {
    return await loadImageToCanvas(file, maxDim)
  } catch (err) {
    console.warn('[file-to-canvas] Image load failed:', err)
    return null
  }
}
