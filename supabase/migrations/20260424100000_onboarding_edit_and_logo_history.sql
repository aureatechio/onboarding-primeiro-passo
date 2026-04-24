-- Migration: ONB-23 — onboarding edit + logo history
-- Plan: plan/2026-04-23-onboarding-overview-editavel.md
--
-- Adiciona:
--   1. onboarding_identity.brand_display_name (precedência sobre clientes.nome em jobs IA)
--   2. Tabela onboarding_logo_history (histórico ilimitado por compra, 1 ativo por vez)
-- RLS: somente usuários autenticados podem ler/escrever (edges admin usam service_role e bypassam RLS).

------------------------------------------------------------
-- 1. Novo campo brand_display_name
------------------------------------------------------------
ALTER TABLE onboarding_identity
  ADD COLUMN IF NOT EXISTS brand_display_name text;

COMMENT ON COLUMN onboarding_identity.brand_display_name IS
  'Nome de exibição da marca. Quando presente, tem precedência sobre clientes.nome em todos os jobs IA (PostGen, PostTurbo, NanoBanana, briefing).';

ALTER TABLE onboarding_identity
  ADD COLUMN IF NOT EXISTS instagram_handle text;

COMMENT ON COLUMN onboarding_identity.instagram_handle IS
  'Handle do Instagram (sem @), regex ^[a-zA-Z0-9._]{1,30}$. Editável pelo painel admin; backfill best-effort a partir de campaign_notes.';

------------------------------------------------------------
-- 2. Histórico de logos
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_logo_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  logo_path text NOT NULL,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_logo_history_one_active_per_compra
  ON onboarding_logo_history (compra_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS onboarding_logo_history_compra_id_idx
  ON onboarding_logo_history (compra_id, uploaded_at DESC);

ALTER TABLE onboarding_logo_history ENABLE ROW LEVEL SECURITY;

-- Policies: edges admin acessam via service_role (bypass RLS).
-- Para clientes autenticados (dashboard), permitir SELECT/INSERT/UPDATE/DELETE.
-- Edges públicas (get-ai-campaign-monitor) usam service_role também.
DROP POLICY IF EXISTS onboarding_logo_history_select ON onboarding_logo_history;
CREATE POLICY onboarding_logo_history_select
  ON onboarding_logo_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS onboarding_logo_history_insert ON onboarding_logo_history;
CREATE POLICY onboarding_logo_history_insert
  ON onboarding_logo_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS onboarding_logo_history_update ON onboarding_logo_history;
CREATE POLICY onboarding_logo_history_update
  ON onboarding_logo_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS onboarding_logo_history_delete ON onboarding_logo_history;
CREATE POLICY onboarding_logo_history_delete
  ON onboarding_logo_history FOR DELETE
  TO authenticated USING (true);

------------------------------------------------------------
-- 3. Backfill: popular histórico a partir dos logo_path atuais
------------------------------------------------------------
INSERT INTO onboarding_logo_history (compra_id, logo_path, is_active)
SELECT compra_id, logo_path, true
FROM onboarding_identity
WHERE logo_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM onboarding_logo_history h WHERE h.compra_id = onboarding_identity.compra_id
  );

------------------------------------------------------------
-- 4. Backfill best-effort: extrair instagram_handle de campaign_notes
------------------------------------------------------------
UPDATE onboarding_identity
SET instagram_handle = (regexp_match(campaign_notes, 'instagram\.com/([A-Za-z0-9._]{1,30})'))[1]
WHERE instagram_handle IS NULL
  AND campaign_notes IS NOT NULL
  AND campaign_notes ~ 'instagram\.com/[A-Za-z0-9._]{1,30}';
