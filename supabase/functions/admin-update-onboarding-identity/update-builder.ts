import {
  validateBrandDisplayName,
  validateBrandPalette,
  validateCampaignNotes,
  validateFontChoice,
  validateInstagramHandle,
  validateSiteUrl,
  type ValidationError,
} from '../_shared/onboarding-validation.ts'

export type IdentityChanges = {
  brand_display_name?: string | null
  font_choice?: string | null
  instagram_handle?: string | null
  site_url?: string | null
  campaign_notes?: string | null
  brand_palette?: string[] | null
}

export type IdentityUpdateResult =
  | { ok: true; update: Record<string, unknown>; siteOrHandleChanged: boolean }
  | { ok: false; error: ValidationError }

export function buildIdentityUpdate(changes: IdentityChanges = {}): IdentityUpdateResult {
  const update: Record<string, unknown> = {}
  let siteOrHandleChanged = false

  if (changes.brand_display_name !== undefined) {
    if (changes.brand_display_name === null || changes.brand_display_name === '') {
      update.brand_display_name = null
    } else {
      const v = validateBrandDisplayName(changes.brand_display_name)
      if (!v.ok) return { ok: false, error: v.error }
      update.brand_display_name = v.value
    }
  }

  if (changes.font_choice !== undefined) {
    if (changes.font_choice === null || changes.font_choice === '') {
      update.font_choice = null
    } else {
      const v = validateFontChoice(changes.font_choice)
      if (!v.ok) return { ok: false, error: v.error }
      update.font_choice = v.value || null
    }
  }

  if (changes.instagram_handle !== undefined) {
    if (changes.instagram_handle === null || changes.instagram_handle === '') {
      update.instagram_handle = null
    } else {
      const v = validateInstagramHandle(changes.instagram_handle)
      if (!v.ok) return { ok: false, error: v.error }
      update.instagram_handle = v.value || null
    }
    siteOrHandleChanged = true
  }

  if (changes.site_url !== undefined) {
    if (changes.site_url === null || changes.site_url === '') {
      update.site_url = null
    } else {
      const v = validateSiteUrl(changes.site_url)
      if (!v.ok) return { ok: false, error: v.error }
      update.site_url = v.value || null
    }
    siteOrHandleChanged = true
  }

  if (changes.campaign_notes !== undefined) {
    if (changes.campaign_notes === null) {
      update.campaign_notes = null
    } else {
      const v = validateCampaignNotes(changes.campaign_notes)
      if (!v.ok) return { ok: false, error: v.error }
      update.campaign_notes = v.value || null
    }
  }

  if (changes.brand_palette !== undefined) {
    if (changes.brand_palette === null) {
      update.brand_palette = []
    } else {
      const v = validateBrandPalette(changes.brand_palette)
      if (!v.ok) return { ok: false, error: v.error }
      update.brand_palette = v.value
    }
  }

  return { ok: true, update, siteOrHandleChanged }
}
