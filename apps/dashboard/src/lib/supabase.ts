import { createSupabaseClient } from '@aurea/shared/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY env vars. ' +
      'Copy .env.example to .env.local and fill in your credentials.'
  )
}

export const supabase = createSupabaseClient({
  url: supabaseUrl,
  key: supabaseKey,
})
