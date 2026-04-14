-- ============================================================================
-- Migration: create onboarding_copy singleton + version history
-- Purpose: Persist onboarding copy edits from the CopyEditor to Supabase
--          so CS/Legal teams can publish text changes without deploys.
-- Pattern: Same singleton pattern as enrichment_config, nanobanana_config.
-- ============================================================================

-- Singleton: holds current published copy (1 row, always UPDATE)
CREATE TABLE onboarding_copy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 0,
  published_by text NOT NULL DEFAULT 'system',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed singleton row (version 0 = no custom copy, use static copy.js fallback)
INSERT INTO onboarding_copy (id) VALUES (gen_random_uuid());

-- Append-only version history (1 row per publish, for rollback/audit)
CREATE TABLE onboarding_copy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  content jsonb NOT NULL,
  changed_etapas text[] DEFAULT '{}',
  published_by text NOT NULL DEFAULT 'system',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_copy_versions_desc
  ON onboarding_copy_versions (version DESC);
