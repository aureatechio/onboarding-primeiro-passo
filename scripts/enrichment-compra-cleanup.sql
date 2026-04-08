-- Limpa dados de onboarding/enrichment/campanha IA para UMA compra (ex.: teste em produção).
-- Uso: Supabase SQL Editor ou psql. Substitua o UUID em todos os lugares marcados REPLACE_COMPRA_ID.
--
-- Depois, no Storage, apague a pasta do bucket `onboarding-identity`: {compra_id}/ (logo e imagens).

BEGIN;

-- Desacopla job de campanha antes de apagar ai_campaign_jobs (FK em onboarding_enrichment_jobs).
UPDATE onboarding_enrichment_jobs
SET campaign_job_id = NULL
WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid;

DELETE FROM ai_campaign_assets
WHERE job_id IN (SELECT id FROM ai_campaign_jobs WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid);

-- Tabela opcional — ignore se não existir no projeto.
DELETE FROM ai_campaign_errors
WHERE job_id IN (SELECT id FROM ai_campaign_jobs WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid);

DELETE FROM ai_campaign_jobs
WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid;

DELETE FROM onboarding_enrichment_jobs
WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid;

DELETE FROM onboarding_briefings
WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid;

DELETE FROM onboarding_identity
WHERE compra_id = 'REPLACE_COMPRA_ID'::uuid;

COMMIT;
