/**
 * Run once with: deno run --allow-write generate-png.ts
 * Generates minimal.png — a 4x4 PNG with 4 known colors for testing.
 *
 * Layout (row-major):
 *   Row 0: Red    Red    Green  Green
 *   Row 1: Red    Red    Green  Green
 *   Row 2: Blue   Blue   White  White
 *   Row 3: Blue   Blue   White  White
 *
 * Colors: #ff0000, #00cc00, #0000ff, #ffffff (white filtered by isUsableColor)
 */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32BE(arr: number[], value: number) {
  arr.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff)
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const out: number[] = []
  writeUint32BE(out, data.length)
  const typeBytes = new TextEncoder().encode(type)
  out.push(...typeBytes)
  out.push(...data)
  const forCrc = new Uint8Array(4 + data.length)
  forCrc.set(typeBytes, 0)
  forCrc.set(data, 4)
  writeUint32BE(out, crc32(forCrc))
  return new Uint8Array(out)
}

const WIDTH = 4
const HEIGHT = 4

const colors: [number, number, number][] = [
  [255, 0, 0],     // Red
  [0, 204, 0],     // Green
  [0, 0, 255],     // Blue
  [255, 255, 255], // White
]

const pixelGrid = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [2, 2, 3, 3],
  [2, 2, 3, 3],
]

// Build raw pixel data (filter byte 0 = None, then RGB)
const rawRows: number[] = []
for (let y = 0; y < HEIGHT; y++) {
  rawRows.push(0) // filter: None
  for (let x = 0; x < WIDTH; x++) {
    const [r, g, b] = colors[pixelGrid[y][x]]
    rawRows.push(r, g, b)
  }
}

// Compress with DecompressionStream's inverse
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  const reader = cs.readable.getReader()
  const writeP = writer.write(data as unknown as BufferSource).then(() => writer.close())
  const chunks: Uint8Array[] = []
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    if (d) done = true
    else if (value) chunks.push(value)
  }
  await writeP
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) { result.set(c, pos); pos += c.length }
  return result
}

const compressed = await deflate(new Uint8Array(rawRows))

// IHDR data: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1)
const ihdrData = new Uint8Array(13)
const ihdrView = new DataView(ihdrData.buffer)
ihdrView.setUint32(0, WIDTH)
ihdrView.setUint32(4, HEIGHT)
ihdrData[8] = 8   // bit depth
ihdrData[9] = 2   // color type: RGB
ihdrData[10] = 0  // compression
ihdrData[11] = 0  // filter
ihdrData[12] = 0  // interlace: none

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const ihdrChunk = makeChunk('IHDR', ihdrData)
const idatChunk = makeChunk('IDAT', compressed)
const iendChunk = makeChunk('IEND', new Uint8Array(0))

const png = new Uint8Array(
  signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
)
let offset = 0
png.set(signature, offset); offset += signature.length
png.set(ihdrChunk, offset); offset += ihdrChunk.length
png.set(idatChunk, offset); offset += idatChunk.length
png.set(iendChunk, offset)

const outPath = 'supabase/functions/_shared/enrichment/__tests__/fixtures/minimal.png'
await Deno.writeFile(outPath, png)
console.log(`Written minimal.png (${png.length} bytes)`)
