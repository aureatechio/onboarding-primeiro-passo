-- Persistencia auditavel do onboarding publico.
-- Mantem o estado atual em onboarding_progress/onboarding_identity e adiciona
-- trilhas imutaveis para aceites, textos vistos e submissões de identidade.

COMMENT ON TABLE onboarding_progress IS
  'Progresso/timestamps do onboarding publico por compra. Aceites auditaveis ficam em onboarding_acceptances.';

CREATE TABLE IF NOT EXISTS onboarding_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  item_key text NOT NULL,
  item_text text NOT NULL,
  item_hash text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  copy_source text NOT NULL DEFAULT 'copy.js',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_acceptances_item_text_not_empty CHECK (length(btrim(item_text)) > 0),
  CONSTRAINT onboarding_acceptances_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_acceptances_compra_item_hash_idx
  ON onboarding_acceptances (compra_id, item_key, item_hash);

CREATE INDEX IF NOT EXISTS onboarding_acceptances_compra_step_idx
  ON onboarding_acceptances (compra_id, step_key, accepted_at DESC);

ALTER TABLE onboarding_acceptances ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE onboarding_acceptances IS
  'Aceites auditaveis do onboarding publico: checkboxes, texto exibido e hash por compra.';
COMMENT ON COLUMN onboarding_acceptances.item_hash IS
  'SHA-256 calculado pela Edge Function sobre item_key + texto final exibido.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_logo_history'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE onboarding_logo_history
      ADD COLUMN source text NOT NULL DEFAULT 'unknown';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_logo_history_source_check'
  ) THEN
    ALTER TABLE onboarding_logo_history
      ADD CONSTRAINT onboarding_logo_history_source_check
      CHECK (source IN ('unknown', 'admin', 'public_onboarding'));
  END IF;
END $$;

COMMENT ON COLUMN onboarding_logo_history.source IS
  'Origem do upload: unknown (legado/backfill), admin ou public_onboarding.';

CREATE TABLE IF NOT EXISTS onboarding_identity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  identity_id uuid REFERENCES onboarding_identity(id) ON DELETE SET NULL,
  logo_history_id uuid REFERENCES onboarding_logo_history(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'public_onboarding',
  choice text NOT NULL CHECK (choice IN ('add_now', 'later')),
  site_url text,
  instagram_handle text,
  campaign_notes text,
  brand_palette text[] NOT NULL DEFAULT '{}',
  production_path text,
  logo_path text,
  logo_original_filename text,
  logo_mime_type text,
  logo_size_bytes bigint,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_identity_submissions_source_check
    CHECK (source IN ('public_onboarding', 'admin', 'system')),
  CONSTRAINT onboarding_identity_submissions_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS onboarding_identity_submissions_compra_idx
  ON onboarding_identity_submissions (compra_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_identity_submissions_identity_idx
  ON onboarding_identity_submissions (identity_id);

ALTER TABLE onboarding_identity_submissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE onboarding_identity_submissions IS
  'Historico imutavel das submissões de identidade visual feitas no onboarding publico.';
