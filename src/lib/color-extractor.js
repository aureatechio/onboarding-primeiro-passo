const SAMPLE_SIZE = 100
const MIN_SATURATION = 0.08
const MIN_LIGHTNESS = 0.06
const MAX_LIGHTNESS = 0.94

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, '0'))
      .join('')
  )
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function isUsableColor(r, g, b, a) {
  if (a < 128) return false
  const [, s, l] = rgbToHsl(r, g, b)
  return s >= MIN_SATURATION && l >= MIN_LIGHTNESS && l <= MAX_LIGHTNESS
}

function getColorChannel(pixels, channel) {
  return pixels.map((p) => p[channel])
}

function getChannelRange(pixels, channel) {
  const values = getColorChannel(pixels, channel)
  return Math.max(...values) - Math.min(...values)
}

function medianCut(pixels, depth) {
  if (depth === 0 || pixels.length === 0) {
    if (pixels.length === 0) return []
    const avg = [0, 1, 2].map((ch) => {
      const sum = pixels.reduce((s, p) => s + p[ch], 0)
      return Math.round(sum / pixels.length)
    })
    return [avg]
  }

  const ranges = [0, 1, 2].map((ch) => getChannelRange(pixels, ch))
  const widestChannel = ranges.indexOf(Math.max(...ranges))

  pixels.sort((a, b) => a[widestChannel] - b[widestChannel])
  const mid = Math.floor(pixels.length / 2)

  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ]
}

function colorDistance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  )
}

function deduplicateColors(colors, minDistance = 40) {
  const unique = []
  for (const color of colors) {
    if (unique.every((u) => colorDistance(u, color) >= minDistance)) {
      unique.push(color)
    }
  }
  return unique
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function samplePixels(imageData) {
  const { data, width, height } = imageData
  const pixels = []
  const step = Math.max(1, Math.floor((width * height) / 5000))

  for (let i = 0; i < width * height; i += step) {
    const offset = i * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const a = data[offset + 3]
    if (isUsableColor(r, g, b, a)) {
      pixels.push([r, g, b])
    }
  }
  return pixels
}

export async function extractColorsFromImage(file, maxColors = 3) {
  if (!file) return []
  if (file.type === 'image/svg+xml') return []

  try {
    const img = await loadImage(file)

    const canvas = document.createElement('canvas')
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(img.width, img.height))
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = samplePixels(imageData)

    if (pixels.length === 0) return []

    const depth = Math.ceil(Math.log2(maxColors + 2))
    const quantized = medianCut([...pixels], depth)
    const unique = deduplicateColors(quantized)

    const sorted = unique.sort((a, b) => {
      const [, sA] = rgbToHsl(a[0], a[1], a[2])
      const [, sB] = rgbToHsl(b[0], b[1], b[2])
      return sB - sA
    })

    return sorted.slice(0, maxColors).map((c) => rgbToHex(c[0], c[1], c[2]))
  } catch (err) {
    console.error('[color-extractor] extraction failed:', err)
    return []
  }
}
