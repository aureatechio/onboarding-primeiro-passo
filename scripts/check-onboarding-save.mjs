#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return

  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function getConfig() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL/SUPABASE_URL ausente.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY ausente.')

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    key,
    keyLabel: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon',
  }
}

async function restSelect(config, table, select, compraId, options = '') {
  const params = new URLSearchParams()
  params.set('select', select)
  params.set('compra_id', `eq.${compraId}`)
  const suffix = options ? `&${options}` : ''
  const url = `${config.supabaseUrl}/rest/v1/${table}?${params.toString()}${suffix}`

  const res = await fetch(url, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message = data?.message || text || `HTTP ${res.status}`
    throw new Error(`${table}: ${message}`)
  }
  return Array.isArray(data) ? data : []
}

async function signStoragePath(config, bucket, path) {
  if (!path) return { ok: false, status: 'missing_path' }

  const encodedPath = String(path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  const url = `${config.supabaseUrl}/storage/v1/object/sign/${bucket}/${encodedPath}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 60 }),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  return {
    ok: res.ok && Boolean(data?.signedURL || data?.signedUrl),
    status: res.status,
    message: data?.message || data?.error || null,
  }
}

function formatBool(value) {
  return value ? 'OK' : 'PENDENTE'
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(vazio)'
  if (value === null || value === undefined || value === '') return '(vazio)'
  return String(value)
}

function printSection(title) {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
}

async function main() {
  const compraId = process.argv[2]?.trim()
  if (!compraId || !UUID_RE.test(compraId)) {
    console.error('Uso: node scripts/check-onboarding-save.mjs <compra_id_uuid>')
    process.exit(1)
  }

  const config = getConfig()

  const [progressRows, identityRows, logoHistoryRows, enrichmentRows, briefingRows] =
    await Promise.all([
      restSelect(
        config,
        'onboarding_progress',
        'compra_id,current_step,traffic_choice,step1_completed_at,step2_completed_at,step3_completed_at,step4_completed_at,step5_completed_at,step6_completed_at,step7_completed_at,step_final_completed_at,completed_at,updated_at',
        compraId
      ),
      restSelect(
        config,
        'onboarding_identity',
        'compra_id,choice,logo_path,brand_palette,font_choice,campaign_images_paths,campaign_notes,production_path,site_url,instagram_handle,updated_at',
        compraId
      ),
      restSelect(
        config,
        'onboarding_logo_history',
        'compra_id,logo_path,original_filename,mime_type,size_bytes,uploaded_at,is_active',
        compraId,
        'order=uploaded_at.desc'
      ).catch((error) => [{ _error: error.message }]),
      restSelect(
        config,
        'onboarding_enrichment_jobs',
        'compra_id,status,phase_colors_status,phase_font_status,phase_briefing_status,phase_campaign_status,campaign_job_id,error_phase,updated_at',
        compraId
      ).catch((error) => [{ _error: error.message }]),
      restSelect(
        config,
        'onboarding_briefings',
        'compra_id,mode,status,error_code,provider,provider_model,updated_at',
        compraId
      ).catch((error) => [{ _error: error.message }]),
    ])

  const progress = progressRows[0] || null
  const identity = identityRows[0] || null
  const logoCheck = await signStoragePath(config, 'onboarding-identity', identity?.logo_path)

  console.log(`Diagnostico onboarding: ${compraId}`)
  console.log(`Projeto: ${config.supabaseUrl}`)
  console.log(`Chave usada: ${config.keyLabel}`)

  printSection('Progresso e checklists')
  if (!progress) {
    console.log('Nenhuma linha em onboarding_progress.')
  } else {
    const steps = [
      ['Etapa 1', progress.step1_completed_at],
      ['Etapa 2 / quiz 3 checkboxes', progress.step2_completed_at],
      ['Etapa 3 / quiz 3 checkboxes', progress.step3_completed_at],
      ['Etapa 4 / quiz 5 checkboxes', progress.step4_completed_at],
      ['Etapa 5 / trafego', progress.step5_completed_at],
      ['Etapa 6.1 / checkbox identidade', progress.step6_completed_at],
      ['Etapa 6.2 / identidade', progress.step7_completed_at],
      ['Final', progress.step_final_completed_at],
    ]
    for (const [label, value] of steps) {
      console.log(`${label}: ${formatBool(value)} ${value ? `(${value})` : ''}`)
    }
    console.log(`current_step: ${formatValue(progress.current_step)}`)
    console.log(`traffic_choice: ${formatValue(progress.traffic_choice)}`)
    console.log('Observacao: o sistema salva timestamps das etapas; nao salva cada checkbox individualmente.')
  }

  printSection('Identidade visual')
  if (!identity) {
    console.log('Nenhuma linha em onboarding_identity.')
  } else {
    console.log(`choice: ${formatValue(identity.choice)}`)
    console.log(`logo_path: ${formatValue(identity.logo_path)}`)
    console.log(`logo no Storage: ${logoCheck.ok ? 'OK' : `NAO CONFIRMADO (${logoCheck.status}${logoCheck.message ? ` - ${logoCheck.message}` : ''})`}`)
    console.log(`brand_palette: ${formatValue(identity.brand_palette)}`)
    console.log(`font_choice: ${formatValue(identity.font_choice)}`)
    console.log(`site_url: ${formatValue(identity.site_url)}`)
    console.log(`instagram_handle: ${formatValue(identity.instagram_handle)}`)
    console.log(`campaign_notes: ${formatValue(identity.campaign_notes)}`)
    console.log(`production_path: ${formatValue(identity.production_path)}`)
    console.log(`updated_at: ${formatValue(identity.updated_at)}`)
  }

  printSection('Historico de logo')
  if (logoHistoryRows[0]?._error) {
    console.log(`Nao foi possivel ler onboarding_logo_history: ${logoHistoryRows[0]._error}`)
  } else if (!logoHistoryRows.length) {
    console.log('Nenhum registro em onboarding_logo_history.')
    console.log('Observacao: o upload publico da Etapa 6.2 grava onboarding_identity.logo_path; historico e usado pelos edges admin/backfill.')
  } else {
    for (const row of logoHistoryRows) {
      console.log(`${row.is_active ? 'ATIVO' : 'historico'}: ${row.logo_path} (${formatValue(row.mime_type)}, ${formatValue(row.size_bytes)} bytes, ${formatValue(row.uploaded_at)})`)
    }
  }

  printSection('Enrichment e briefing')
  if (enrichmentRows[0]?._error) {
    console.log(`Nao foi possivel ler onboarding_enrichment_jobs: ${enrichmentRows[0]._error}`)
  } else if (!enrichmentRows.length) {
    console.log('Nenhum job em onboarding_enrichment_jobs.')
  } else {
    const job = enrichmentRows[0]
    console.log(`job status: ${formatValue(job.status)}`)
    console.log(`colors/font/briefing/campaign: ${formatValue(job.phase_colors_status)} / ${formatValue(job.phase_font_status)} / ${formatValue(job.phase_briefing_status)} / ${formatValue(job.phase_campaign_status)}`)
    console.log(`campaign_job_id: ${formatValue(job.campaign_job_id)}`)
    console.log(`error_phase: ${formatValue(job.error_phase)}`)
    console.log(`updated_at: ${formatValue(job.updated_at)}`)
  }

  if (briefingRows[0]?._error) {
    console.log(`Nao foi possivel ler onboarding_briefings: ${briefingRows[0]._error}`)
  } else if (!briefingRows.length) {
    console.log('Nenhum briefing em onboarding_briefings.')
  } else {
    const briefing = briefingRows[0]
    console.log(`briefing status: ${formatValue(briefing.status)} (${formatValue(briefing.provider)} ${formatValue(briefing.provider_model)})`)
    console.log(`updated_at: ${formatValue(briefing.updated_at)}`)
  }
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`)
  process.exit(1)
})
