-- Migration: create onboarding_enrichment_jobs table
-- Plan: 2026-04-08-enrichment-bloco1-schema.md (T1.2)

CREATE TABLE onboarding_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,

  -- Status global do job (mesmo padrao de ai_campaign_jobs)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')),

  -- Status individual por fase
  phase_colors_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_colors_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_font_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_font_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_briefing_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_briefing_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_campaign_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_campaign_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),

  -- Resultados da Fase 1 (Cores)
  extracted_palette text[],
  extracted_palette_source text
    CHECK (extracted_palette_source IS NULL
      OR extracted_palette_source IN ('logo_algorithm', 'logo_gemini', 'site_css', 'fallback')),

  -- Resultados da Fase 2 (Fonte)
  detected_font text,
  detected_font_source text
    CHECK (detected_font_source IS NULL
      OR detected_font_source IN ('site_css', 'gemini_suggestion', 'fallback')),
  font_validated boolean DEFAULT false,
  font_validation_reason text,

  -- Resultados da Fase 3 (Briefing)
  briefing_generated boolean DEFAULT false,

  -- Resultados da Fase 4 (Campanha)
  campaign_job_id uuid REFERENCES ai_campaign_jobs(id),

  -- Diagnostico
  error_phase text,
  error_message text,
  phases_log jsonb NOT NULL DEFAULT '[]',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_enrichment_jobs_compra
  ON onboarding_enrichment_jobs (compra_id);
