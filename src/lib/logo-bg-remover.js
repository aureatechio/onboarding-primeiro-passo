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

function rgbDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function sampleEdgePixels(imageData) {
  const { data, width, height } = imageData
  const pixels = []

  const addPixel = (x, y) => {
    const i = (y * width + x) * 4
    if (data[i + 3] > 128) {
      pixels.push([data[i], data[i + 1], data[i + 2]])
    }
  }

  for (let x = 0; x < width; x++) {
    addPixel(x, 0)
    addPixel(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    addPixel(0, y)
    addPixel(width - 1, y)
  }

  return pixels
}

function findDominantEdgeColor(edgePixels, distanceThreshold) {
  if (edgePixels.length === 0) return null

  let bestColor = edgePixels[0]
  let bestCount = 0

  for (const candidate of edgePixels) {
    let count = 0
    for (const px of edgePixels) {
      if (rgbDistance(candidate[0], candidate[1], candidate[2], px[0], px[1], px[2]) < distanceThreshold) {
        count++
      }
    }
    if (count > bestCount) {
      bestCount = count
      bestColor = candidate
    }
  }

  return { color: bestColor, ratio: bestCount / edgePixels.length }
}

/**
 * Attempts to remove simple light backgrounds from a logo image.
 * Returns a Blob of the processed PNG, or null if background is not simple.
 *
 * "Simple" = 70%+ of edge pixels are similar AND light (HSL lightness > 0.85).
 */
export async function removeSimpleBackground(file, options = {}) {
  const {
    lightThreshold = 0.85,
    edgeSimilarityRatio = 0.70,
    colorDistance: dist = 50,
    maxDimension = 800,
  } = options

  const { fileToCanvas } = await import('./file-to-canvas')
  const canvas = await fileToCanvas(file, maxDimension)
  if (!canvas) return null

  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const edgePixels = sampleEdgePixels(imageData)

  if (edgePixels.length < 10) return null

  const dominant = findDominantEdgeColor(edgePixels, dist)
  if (!dominant || dominant.ratio < edgeSimilarityRatio) return null

  const [, , l] = rgbToHsl(dominant.color[0], dominant.color[1], dominant.color[2])
  if (l < lightThreshold) return null

  const { data } = imageData
  const [dr, dg, db] = dominant.color
  let changed = 0

  for (let i = 0; i < data.length; i += 4) {
    if (rgbDistance(data[i], data[i + 1], data[i + 2], dr, dg, db) < dist) {
      data[i + 3] = 0
      changed++
    }
  }

  if (changed === 0) return null

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}
