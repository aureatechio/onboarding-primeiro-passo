/**
 * Teste manual: POST save-onboarding-identity (logo + site + Instagram) e polling get-enrichment-status.
 *
 * Uso (PowerShell):
 *   $env:VITE_SUPABASE_ANON_KEY="sua_anon_key"
 *   node scripts/run-enrichment-e2e-save-identity.mjs ab5b4931-7d10-4a81-adb6-b2db20d4fa04
 *
 * Bash:
 *   export VITE_SUPABASE_ANON_KEY=...
 *   node scripts/run-enrichment-e2e-save-identity.mjs ab5b4931-7d10-4a81-adb6-b2db20d4fa04
 *
 * Opcional: terceiro argumento = caminho do logo (default: scripts/fixtures/emporio-fitness-logo.png)
 * Variáveis: VITE_SUPABASE_URL (default projeto Acelerai), SITE_URL, INSTAGRAM_HANDLE
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const compraId = process.argv[2] || process.env.COMPRA_ID
const anon = process.env.VITE_SUPABASE_ANON_KEY
const base = (process.env.VITE_SUPABASE_URL || 'https://awqtzoefutnfmnbomujt.supabase.co').replace(/\/$/, '')
const siteUrl = process.env.SITE_URL || 'https://acelerai.com'
const instagramHandle = process.env.INSTAGRAM_HANDLE || 'acelerai'
const logoPath =
  process.argv[3] || join(__dirname, 'fixtures', 'emporio-fitness-logo.png')

if (!compraId) {
  console.error('Informe compra_id (UUID) como primeiro argumento.')
  process.exit(1)
}
if (!anon) {
  console.error(
    'Defina VITE_SUPABASE_ANON_KEY (Dashboard Supabase → Settings → API → anon public).',
  )
  process.exit(1)
}

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
}

async function saveIdentity() {
  const buf = readFileSync(logoPath)
  const blob = new Blob([buf], { type: 'image/png' })
  const form = new FormData()
  form.append('compra_id', compraId)
  form.append('choice', 'add_now')
  form.append('site_url', siteUrl)
  form.append('instagram_handle', instagramHandle)
  form.append('logo', blob, 'logo.png')

  const res = await fetch(`${base}/functions/v1/save-onboarding-identity`, {
    method: 'POST',
    headers,
    body: form,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

async function enrichmentStatus() {
  const url = `${base}/functions/v1/get-enrichment-status?compra_id=${encodeURIComponent(compraId)}`
  const res = await fetch(url, { headers })
  const text = await res.text()
  try {
    return { status: res.status, json: JSON.parse(text) }
  } catch {
    return { status: res.status, json: { raw: text } }
  }
}

console.log('Logo:', logoPath)
console.log('compra_id:', compraId)
console.log('site_url:', siteUrl, '| instagram:', instagramHandle)

const save = await saveIdentity()
console.log('\n[save-onboarding-identity]', save.status, JSON.stringify(save.json, null, 2))

if (!save.json?.success) {
  process.exit(save.status >= 400 ? 1 : 1)
}

const deadline = Date.now() + 120_000
let last = null
while (Date.now() < deadline) {
  const st = await enrichmentStatus()
  last = st
  const job = st.json?.data
  const status = job?.status
  console.log(
    `[get-enrichment-status] ${st.status} global=${status} colors=${job?.phase_colors_status} font=${job?.phase_font_status} briefing=${job?.phase_briefing_status} campaign=${job?.phase_campaign_status}`,
  )
  if (status === 'completed' || status === 'partial' || status === 'failed') {
    console.log('\nFinal:', JSON.stringify(st.json, null, 2))
    process.exit(status === 'failed' ? 2 : 0)
  }
  await new Promise((r) => setTimeout(r, 5000))
}

console.error('\nTimeout 120s. Última resposta:', JSON.stringify(last, null, 2))
process.exit(3)
