-- Migration: add site_url and instagram_handle to onboarding_identity
-- Plan: 2026-04-08-enrichment-bloco1-schema.md (T1.1)

ALTER TABLE onboarding_identity
  ADD COLUMN site_url text,
  ADD COLUMN instagram_handle text;

COMMENT ON COLUMN onboarding_identity.site_url IS 'URL do site da empresa (https://...)';
COMMENT ON COLUMN onboarding_identity.instagram_handle IS 'Handle do Instagram sem @ (ex: emporiofitness)';
