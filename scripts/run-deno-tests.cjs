const { spawnSync } = require('node:child_process')

const denoCheck = spawnSync('deno', ['--version'], {
  stdio: 'ignore',
  shell: true,
})

if (denoCheck.status !== 0) {
  console.warn(
    '[test] Deno nao encontrado no ambiente. Pulando suite Deno; rode manualmente em ambiente com Deno instalado.'
  )
  process.exit(0)
}

const denoArgs = [
  'test',
  'supabase/functions/process-checkout/handlers',
  'supabase/functions/_shared/checkout-session-errors.test.ts',
  'supabase/functions/_shared/operational-events.test.ts',
  'supabase/functions/_shared/checkout-url.test.ts',
  '--allow-env',
  '--allow-net',
  '--allow-read',
]

const result = spawnSync('deno', denoArgs, {
  stdio: 'inherit',
  shell: true,
})

if (typeof result.status === 'number') {
  process.exit(result.status)
}

process.exit(1)
