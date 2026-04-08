-- Migration: create enrichment_config singleton table
-- Plan: 2026-04-08-enrichment-bloco1-schema.md (T1.3)

CREATE TABLE enrichment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fase 1: Cores
  color_gemini_prompt text NOT NULL
    DEFAULT 'Analise este logo e retorne as 3-5 cores primarias da marca em formato hex (#RRGGBB). Retorne APENAS um array JSON de strings hex, sem explicacao.',
  color_fallback_palette text[] NOT NULL DEFAULT '{"#384ffe","#1a1a2e","#f5f5f5"}',
  color_extraction_max integer NOT NULL DEFAULT 5,

  -- Fase 2: Fonte
  font_validation_prompt text NOT NULL
    DEFAULT 'Voce e um diretor de arte senior especializado em publicidade. A empresa ''${company_name}'' do segmento ''${segment}'' usa a fonte ''${detected_font}''. Essa fonte e adequada para material publicitario profissional? Responda SOMENTE em JSON valido: { "approved": boolean, "reason": "string", "suggestion": "string ou null" }',
  font_suggestion_prompt text NOT NULL
    DEFAULT 'Voce e um diretor de arte senior. Sugira UMA fonte profissional para material publicitario da empresa ''${company_name}'' do segmento ''${segment}''. Responda SOMENTE o nome da fonte, sem explicacao.',
  font_fallback text NOT NULL DEFAULT 'Inter',

  -- Fase 3: Briefing
  briefing_auto_mode text NOT NULL DEFAULT 'text',

  -- Modelo Gemini (usado nas fases 1 e 2)
  gemini_model_name text NOT NULL DEFAULT 'gemini-2.0-flash',
  gemini_api_base_url text NOT NULL DEFAULT 'https://generativelanguage.googleapis.com/v1beta',
  gemini_temperature numeric NOT NULL DEFAULT 0.2,

  -- Timeouts por fase (ms)
  timeout_colors_ms integer NOT NULL DEFAULT 10000,
  timeout_font_ms integer NOT NULL DEFAULT 15000,
  timeout_briefing_ms integer NOT NULL DEFAULT 30000,
  timeout_campaign_ms integer NOT NULL DEFAULT 10000,

  -- Retry automatico intra-fase
  retry_gemini_max integer NOT NULL DEFAULT 2,
  retry_gemini_backoff_ms text NOT NULL DEFAULT '1000,3000',
  retry_scrape_max integer NOT NULL DEFAULT 1,
  retry_scrape_backoff_ms text NOT NULL DEFAULT '2000',

  -- Scraping
  scrape_timeout_ms integer NOT NULL DEFAULT 5000,
  scrape_user_agent text NOT NULL DEFAULT 'AceleraiBot/1.0 (+https://acelerai.com)',

  -- Metadata
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir registro default (singleton)
INSERT INTO enrichment_config (id) VALUES (gen_random_uuid());
