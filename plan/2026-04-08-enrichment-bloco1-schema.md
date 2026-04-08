# Bloco 1 — Schema e Infraestrutura

**Orquestrador**: `2026-04-08-onboarding-enrichment-master.md`
**Spec**: `supabase/functions/onboarding-enrichment/functionSpec.md`
**Dependencia**: Nenhuma (primeiro bloco)

## Objetivo

Criar as bases de dados e o modulo de configuracao que todo o pipeline de enriquecimento consome. Sem este bloco, nenhum dos outros pode iniciar.

## Tarefas

### T1.1 — Migration: novas colunas em `onboarding_identity`

**Arquivo**: `supabase/migrations/YYYYMMDDHHMMSS_add_identity_site_instagram.sql`

```sql
ALTER TABLE onboarding_identity
  ADD COLUMN site_url text,
  ADD COLUMN instagram_handle text;

COMMENT ON COLUMN onboarding_identity.site_url IS 'URL do site da empresa (https://...)';
COMMENT ON COLUMN onboarding_identity.instagram_handle IS 'Handle do Instagram sem @ (ex: emporiofitness)';
```

**Validacao**: Confirmar colunas via `SELECT column_name FROM information_schema.columns WHERE table_name = 'onboarding_identity'`.

### T1.2 — Migration: tabela `onboarding_enrichment_jobs`

**Arquivo**: `supabase/migrations/YYYYMMDDHHMMSS_create_enrichment_jobs.sql`

DDL completo conforme spec (secao "Nova tabela: onboarding_enrichment_jobs"):

- 5 status globais: `pending`, `processing`, `completed`, `partial`, `failed`
- 4 campos `phase_*_status` com CHECK constraint
- Campos de resultado por fase (palette, font, briefing, campaign)
- `phases_log` jsonb
- UNIQUE index em `compra_id`
- FK para `compras(id)` com ON DELETE CASCADE
- FK para `ai_campaign_jobs(id)` em `campaign_job_id`

**Validacao**: Confirmar tabela e constraints via `\d onboarding_enrichment_jobs`.

### T1.3 — Migration: tabela `enrichment_config`

**Arquivo**: `supabase/migrations/YYYYMMDDHHMMSS_create_enrichment_config.sql`

DDL completo conforme spec (secao "Nova tabela: enrichment_config"):

- Prompts com defaults (color_gemini_prompt, font_validation_prompt, font_suggestion_prompt)
- Fallbacks (color_fallback_palette, font_fallback)
- Parametros Gemini (model, temperature, base_url)
- Timeouts por fase (colors, font, briefing, campaign)
- Retry config (gemini max/backoff, scrape max/backoff)
- Scraping config (timeout, user_agent)
- INSERT do registro default (singleton)

**Validacao**: Confirmar `SELECT count(*) FROM enrichment_config` = 1.

### T1.4 — Modulo `_shared/enrichment/config.ts`

**Arquivo**: `supabase/functions/_shared/enrichment/config.ts`

Seguir o padrao exato de `_shared/nanobanana/config.ts`:

- Type `EnrichmentConfig` com todos os campos da tabela
- Constante `CONFIG_TABLE = 'enrichment_config'`
- Funcao `loadEnrichmentConfig(supabase)` com cache TTL de 5 minutos
- Export de constantes: `DEFAULT_COLOR_FALLBACK_PALETTE`, `DEFAULT_FONT_FALLBACK`, etc.
- Funcao `resolvePromptTemplate(template, vars)` para substituir `${company_name}`, `${segment}`, `${detected_font}`

**Validacao**: Import funciona em outro modulo; config carregada com cache; template variables resolvidas corretamente.

## Checklist de conclusao

- 3 migrations criadas e aplicadas em producao
- `enrichment_config` com 1 registro default
- `_shared/enrichment/config.ts` criado e exportando types + loader + template resolver
- Nenhuma funcao existente quebrada (migrations sao aditivas)

