# Bloco 3 — Edge Functions

**Orquestrador**: `2026-04-08-onboarding-enrichment-master.md`
**Spec**: `supabase/functions/onboarding-enrichment/functionSpec.md`
**Dependencia**: Blocos 1 + 2

## Objetivo

Implementar as Edge Functions novas e alterar as existentes para ativar o pipeline de enriquecimento.

## Tarefas

### T3.1 — `onboarding-enrichment/index.ts` (nova)

**Arquivo**: `supabase/functions/onboarding-enrichment/index.ts`
**Auth**: Interna (service role)
**Deploy**: `--no-verify-jwt`

O orquestrador principal. Implementar conforme spec:

**Fase sincrona:**
1. CORS + validacao (metodo, auth, compra_id, retry_from_phase)
2. Carregar `enrichment_config` via `loadEnrichmentConfig()`
3. Verificar elegibilidade via `checkAiCampaignEligibility()`
4. Buscar `onboarding_identity` (verificar site_url/instagram_handle)
5. Upsert em `onboarding_enrichment_jobs`
6. Se `retry_from_phase`: buscar job existente, resetar fases
7. Retornar resposta imediata
8. `EdgeRuntime.waitUntil()` para pipeline assincrono

**Pipeline assincrono (4 fases):**

Cada fase segue o padrao:
```
updatePhaseStatus('processing')
appendPhaseLog({ started_at })
try { executar } catch { fallback }
updatePhaseStatus('completed' | 'failed')
appendPhaseLog({ finished_at, duration_ms, attempts })
```

- **Fase 1 (colors)**: Usar `color-extractor.ts`. Waterfall: algoritmo → Gemini → CSS → fallback. Gravar resultado em job + atualizar `onboarding_identity.brand_palette`.
- **Fase 2 (font)**: Usar `font-detector.ts`. Gravar resultado em job + atualizar `onboarding_identity.font_choice`.
- **Fase 3 (briefing)**: Montar payload automaticamente do banco. Chamar `generate-campaign-briefing` internamente via HTTP POST com service role.
- **Fase 4 (campaign)**: Chamar `create-ai-campaign-job` internamente via HTTP POST com service role.

**Calculo de status final**: Conforme tabela da spec.

**Pontos de atencao:**
- Cada fase deve ter timeout independente (da `enrichment_config`)
- `phases_log` deve seguir o schema tipado da spec (com `attempts[]`)
- Se `retry_from_phase`, pular fases anteriores
- Buscar dados de contexto (company_name, celebrity_name, segment, region) uma unica vez no inicio e repassar para as fases

### T3.2 — `get-enrichment-status/index.ts` (nova)

**Arquivo**: `supabase/functions/get-enrichment-status/index.ts`
**Auth**: Publica (`--no-verify-jwt`)
**Metodo**: GET
**Query param**: `compra_id` (UUID)

Endpoint simples de leitura:
1. Validar `compra_id`
2. SELECT em `onboarding_enrichment_jobs` WHERE `compra_id`
3. Se nao encontrado → 404
4. Retornar todos os campos do job (status, phases, resultados, log)

Criar tambem `functionSpec.md` para esta funcao.

### T3.3 — `get-enrichment-config/index.ts` (nova)

**Arquivo**: `supabase/functions/get-enrichment-config/index.ts`
**Auth**: Publica (read-only, `--no-verify-jwt`)
**Metodo**: GET

Mesmo padrao de `get-perplexity-config` e `get-nanobanana-config`:
1. SELECT da tabela singleton `enrichment_config`
2. Retornar todos os campos

Criar tambem `functionSpec.md`.

### T3.4 — `update-enrichment-config/index.ts` (nova)

**Arquivo**: `supabase/functions/update-enrichment-config/index.ts`
**Auth**: Protegida via `x-admin-password` (`--no-verify-jwt`)
**Metodo**: POST

Mesmo padrao de `update-perplexity-config` e `update-nanobanana-config`:
1. Validar `x-admin-password` via `requireAdminPassword()` de `_shared/admin-auth.ts`
2. Validar campos do body (tipos, ranges)
3. UPDATE na tabela singleton
4. Retornar config atualizada

Criar tambem `functionSpec.md`.

### T3.5 — Alterar `save-onboarding-identity/index.ts`

**Alteracoes:**

1. **Aceitar novos campos no FormData/JSON:**
   - `site_url` (string, opcional, validar como URL se presente)
   - `instagram_handle` (string, opcional, validar como handle se presente)

2. **Persistir novos campos no upsert:**
   - `site_url` e `instagram_handle` como colunas separadas
   - Manter `campaign_notes` por compatibilidade (continuar aceitando e gravando)

3. **Setar `production_path = 'standard'` automaticamente** quando `site_url` ou `instagram_handle` presentes (nao depender mais do frontend)

4. **Alterar trigger:**
   - Antes: se `production_path === 'standard'` → chamar `create-ai-campaign-job`
   - Agora: se `site_url` OU `instagram_handle` preenchidos → chamar `onboarding-enrichment` (fire-and-forget com service role)
   - Manter o trigger antigo comentado como fallback documentado

### T3.6 — Alterar `create-ai-campaign-job/index.ts`

**Alteracoes:**

1. **Relaxar gate de identidade** (linhas 317-322 atuais):
   - Antes: `!identity.logo_path` → rejeita
   - Agora: `logo_path` desejavel mas nao obrigatorio. Manter gate para `brand_palette` e `font_choice` (agora preenchidos pelo enrichment)

2. **Carregar briefing:**
   - Apos carregar identity, fazer SELECT em `onboarding_briefings` WHERE `compra_id` e `status = 'done'`
   - Se existir `briefing_json`, extrair: `objetivo_campanha`, `publico_alvo`, `tom_voz`, `mensagem_central`, `cta_principal`, `insights_pecas`

3. **Enriquecer `PromptInput`:**
   - Adicionar campos do briefing ao `PromptInput` type
   - Passar para `buildPrompt()` — alteracao em `prompt-builder.ts` (Bloco 5)

## Deploy

```bash
# Novas funcoes
supabase functions deploy onboarding-enrichment --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy get-enrichment-status --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy get-enrichment-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy update-enrichment-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt

# Funcoes alteradas
supabase functions deploy save-onboarding-identity --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy create-ai-campaign-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

## Checklist de conclusao

- [x] `onboarding-enrichment` deployed — 4 fases + retry + phases_log
- [x] `get-enrichment-status` deployed — retorna status com todas as fases
- [x] `get-enrichment-config` deployed — retorna config completa
- [x] `update-enrichment-config` deployed — aceita update com admin password
- [x] `save-onboarding-identity` aceita `site_url`/`instagram_handle` e dispara enrichment
- [x] `create-ai-campaign-job` aceita job sem logo + carrega briefing
- [x] functionSpec.md criado para cada funcao nova
- [x] Logs estruturados conforme spec
