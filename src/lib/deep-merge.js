/**
 * Deep merge for onboarding copy: merges Supabase overrides over static copy.js defaults.
 *
 * Rules:
 * - Functions in static copy are ALWAYS preserved (Supabase can't store functions)
 * - String/number overrides replace the static value
 * - Array overrides replace the entire static array (not element-by-element)
 * - Object overrides are deep-merged recursively
 * - Undefined/null overrides are ignored (static value kept)
 */
export function deepMergeCopy(staticObj, override) {
  if (override === undefined || override === null) return staticObj
  if (typeof staticObj === 'function') return staticObj
  if (typeof override !== 'object' || Array.isArray(override)) return override
  if (typeof staticObj !== 'object' || Array.isArray(staticObj)) return override

  const result = { ...staticObj }
  for (const key of Object.keys(override)) {
    result[key] = deepMergeCopy(staticObj[key], override[key])
  }
  return result
}
