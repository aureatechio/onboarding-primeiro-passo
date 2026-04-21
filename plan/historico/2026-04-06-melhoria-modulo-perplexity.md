# Plano: Melhoria do Modulo Perplexity — Consolidacao Arquitetural e SDD

**Data:** 2026-04-06
**Status:** ✓ Concluido (Fases 1-5 concluidas)
**Motivacao:** O modulo Perplexity cresceu organicamente com boa engenharia de contexto (prompts versionados, config dinamica, guard rails) mas sem consolidacao arquitetural. Ha duplicacao significativa de codigo entre 4 Edge Functions, ausencia completa de functionSpec.md (quebrando o padrao SDD do repo) e uma copia local divergente de `normalizeProviderResponse` dentro de `generate-campaign-briefing`. Este plano corrige esses gaps e eleva o modulo ao mesmo nivel de rigor do modulo OMIE.

---

## Diagnostico (resumo)

| Causa raiz | Impacto | Evidencia |
|------------|---------|-----------|
| `callProvider()` reimplementado em 4 funcoes | Bug fix em uma nao propaga para as outras; drift silencioso | Comparar `callProvider` em test-perplexity-briefing, generate-campaign-briefing, discover-company-sources, suggest-briefing-seed |
| `loadDbConfig()` copiado em 4 funcoes | Idem; cache global sem TTL duplicado | Mesmo pattern identico em cada `index.ts` |
| `AppError`, `ProviderHttpError`, `mapError()`, helpers duplicados | Classes de erro divergem sutilmente entre funcoes | `test-perplexity-briefing` tem `ProviderHttpError` e `AppError` com mesma interface mas instancias diferentes |
| `generate-campaign-briefing` redefine `normalizeProviderResponse` localmente | Duas implementacoes coexistem (local com 3 params vs shared com 4 params); assinatura diverge | `generate-campaign-briefing/index.ts` linhas 179-301 vs `_shared/perplexity/normalize.ts` |
| 0 de 6 Edge Functions Perplexity possuem `functionSpec.md` | Agente IA nao tem contrato formal; onboarding de devs depende de ler codigo | `ls supabase/functions/{get,update}-perplexity-config/` — so `index.ts` |
| Funcoes de config (get/update) sem autenticacao | Qualquer um pode ler/alterar prompts e API key | `get-perplexity-config` e `update-perplexity-config` sao publicas sem rate limit |
| Cobertura de testes parcial | `discover.ts`, `normalize.ts`, `prompt.ts` sem testes unitarios | `ls _shared/perplexity/*.test.*` — so `suggest.test.ts` |
| DI pattern so em `generate-campaign-briefing` | Demais funcoes tem Deno.serve inline, impossivel testar sem mock HTTP | Comparar exports de `generate-campaign-briefing` vs demais |
| `ai-step2/PRD.md` e `CONTRACT.md` nao referenciam Perplexity | Docs do pipeline nao documentam o provider principal | Busca por "perplexity" em ai-step2/ retorna 0 ocorrencias |

---

## Fase 1 — Extrair Shared Client (estimativa: 2-3h)

### Passo 1.1: Criar `_shared/perplexity/client.ts`

**Arquivo:** `supabase/functions/_shared/perplexity/client.ts` (novo)
**Conteudo:** Extrair as seguintes abstrações duplicadas para um módulo único:

```typescript
// Classes de erro
export class AppError extends Error {
  code: ErrorCode
  httpStatus: number
}
export class ProviderHttpError extends Error {
  status: number
  body: string
}

// Tipos
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'SUGGEST_GUARDRAIL_VIOLATION'
  | 'PERPLEXITY_PROVIDER_ERROR'
  | 'PERPLEXITY_TIMEOUT'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR'

// Interface unificada de config DB
export interface PerplexityDbConfig {
  model: string
  api_base_url: string
  api_key?: string | null
  timeout_ms: number
  temperature: number
  top_p: number
  search_mode: string
  search_recency_filter: string
  system_prompt: string
  user_prompt_template: string
  insights_count: number
  prompt_version: string
  strategy_version: string
  contract_version: string
  suggest_system_prompt?: string | null
  suggest_user_prompt_template?: string | null
  suggest_prompt_version?: string | null
  suggest_strategy_version?: string | null
}

// Defaults
export const DEFAULT_MODEL = 'sonar'
export const DEFAULT_API_BASE_URL = 'https://api.perplexity.ai'
export const DEFAULT_TIMEOUT_MS = 15_000

// Funcoes compartilhadas
export function loadDbConfig(supabase): Promise<PerplexityDbConfig | null>
export function callProvider(payload, dbCfg): Promise<ProviderResponse>
export function mapError(error, logPrefix): AppError
export function json(body, status): Response
export function asNonEmptyString(value): string
export function isValidHttpUrl(value): boolean
export function isValidUuid(value): boolean
```

**Regras:**
- `loadDbConfig` deve ter TTL de 5 minutos (novo) para evitar stale config
- `callProvider` unifica a logica de resolucao env var → db → default para API key, base URL e timeout
- `mapError` recebe `logPrefix` para logs contextualizados (ex: `[discover-company-sources]`)

### Passo 1.2: Migrar `generate-campaign-briefing` para importar de `normalize.ts`

**Arquivo:** `supabase/functions/generate-campaign-briefing/index.ts`
**Acao:**
1. Remover as funcoes locais: `extractJsonObject`, `normalizeInsight`, `normalizeBriefingObject`, `normalizeProviderResponse` (linhas 179-301)
2. Adicionar import: `import { normalizeProviderResponse, NormalizeError } from '../_shared/perplexity/normalize.ts'`
3. Adaptar a chamada de `normalizeProviderResponse` para usar a assinatura shared (4 params com `versions` object):
   ```typescript
   const normalized = normalizeProviderResponse(input, providerResponse, configuredModel, {
     contractVersion, promptVersion, strategyVersion,
   })
   ```
4. Manter a interface `Dependencies` e o pattern DI — apenas delegar para o shared

**Cuidado:** A versao local usa 3 params e versoes hardcoded internas. A versao shared usa 4 params com versions explicitas. Garantir que o comportamento final seja identico.

### Passo 1.3: Migrar as 4 Edge Functions para `client.ts`

**Arquivos afetados:**
- `supabase/functions/test-perplexity-briefing/index.ts`
- `supabase/functions/generate-campaign-briefing/index.ts`
- `supabase/functions/discover-company-sources/index.ts`
- `supabase/functions/suggest-briefing-seed/index.ts`

**Acao em cada funcao:**
1. Remover definicoes locais de `AppError`, `ProviderHttpError`, `callProvider`, `loadDbConfig`, `mapError`, `json`, `asNonEmptyString`, `isValidHttpUrl`, helpers
2. Substituir por: `import { AppError, callProvider, loadDbConfig, mapError, json, ... } from '../_shared/perplexity/client.ts'`
3. Manter apenas logica especifica da funcao: `validateInput`, handler, persistencia

**Validacao:** Cada funcao apos migracao deve ter menos de ~100 linhas (vs 200-400+ atuais).

### Passo 1.4: Testes de regressao

**Acao:**
```bash
# Rodar testes existentes
deno test supabase/functions/_shared/perplexity/ --allow-env --allow-net --allow-read
deno test supabase/functions/generate-campaign-briefing/ --allow-env --allow-net --allow-read

# Verificar build (sem erros de importacao)
deno check supabase/functions/test-perplexity-briefing/index.ts
deno check supabase/functions/generate-campaign-briefing/index.ts
deno check supabase/functions/discover-company-sources/index.ts
deno check supabase/functions/suggest-briefing-seed/index.ts
```

---

## Fase 2 — functionSpec.md para todas as 6 funcoes (estimativa: 3-4h)

Seguir o padrao SDD do repo: cada functionSpec.md ao lado do `index.ts`.

### Passo 2.1: `generate-campaign-briefing/functionSpec.md`

```markdown
# generate-campaign-briefing

## Proposito
Gera briefing estruturado de campanha com celebridade via Perplexity Sonar.
Persiste resultado em `onboarding_briefings`.

## Metodo / Acesso
POST | Publica (--no-verify-jwt, autenticacao no codigo se necessario)

## Input
| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| compra_id | UUID | sim | regex UUID v4 |
| company_name | string | sim | 2-120 chars |
| company_site | string (URL) | sim | HTTP/HTTPS valida |
| celebrity_name | string | sim | 2-120 chars |
| context.segment | string | nao | |
| context.region | string | nao | |
| context.campaign_goal_hint | enum | nao | awareness, conversao, retencao |
| briefing_input.mode | enum | nao | text, audio, both |
| briefing_input.text | string | nao | |

## Output (sucesso)
{ success: true, data: NormalizedData }
NormalizedData: { compra_id, provider, model, contract_version, prompt_version,
  strategy_version, briefing: NormalizedBriefing, insights_pecas: NormalizedInsight[],
  citacoes: Citation[], raw: { provider_response_id, usage } }

## Error Codes
| Codigo | HTTP | Descricao |
|--------|------|-----------|
| INVALID_INPUT | 400 | Payload invalido |
| PERPLEXITY_PROVIDER_ERROR | 502 | Falha HTTP do provider |
| PERPLEXITY_TIMEOUT | 504 | Timeout (default 15s) |
| INVALID_PROVIDER_RESPONSE | 502 | JSON invalido ou estrutura incompleta |
| INTERNAL_ERROR | 500 | Falha de persistencia ou config |

## Dependencias
- _shared/perplexity/prompt.ts (buildPerplexityPayload)
- _shared/perplexity/normalize.ts (normalizeProviderResponse)
- _shared/perplexity/client.ts (callProvider, loadDbConfig)
- Tabelas: onboarding_briefings, perplexity_config

## Fluxo
1. Valida input
2. Carrega config do banco (perplexity_config)
3. Resolve modo de persistencia (text/audio/both)
4. Persiste status pending
5. Constroi payload via buildPerplexityPayload
6. Chama Perplexity via callProvider
7. Normaliza resposta
8. Persiste briefing + citacoes com status done
9. Retorna NormalizedData

## Versionamento
contract_version, prompt_version, strategy_version — resolvidos da config DB com fallback hardcoded v1.0.0.
```

### Passo 2.2: `test-perplexity-briefing/functionSpec.md`

**Conteudo (resumo):**
- Proposito: Sandbox de testes para geracao de briefing. Persiste em `perplexity_test_runs`.
- GET: lista historico de test runs por compra_id (paginado, max 50)
- POST: executa teste de briefing e persiste resultado (sucesso ou erro)
- Mesmo input e error codes do generate-campaign-briefing
- Output adicional: `run_id`, `duration_ms`

### Passo 2.3: `suggest-briefing-seed/functionSpec.md`

**Conteudo (resumo):**
- Proposito: Sugere texto de briefing (seed) para o cliente revisar
- POST com: company_name, company_site, celebrity_name, sources[]?, segment?, region?, campaign_goal_hint?
- Output: `{ success, data: { text, contract_version, prompt_version, strategy_version } }`
- Error code adicional: `SUGGEST_GUARDRAIL_VIOLATION` (422) — texto < 120 chars ou placeholder nao resolvido

### Passo 2.4: `discover-company-sources/functionSpec.md`

**Conteudo (resumo):**
- Proposito: Descobre perfis digitais oficiais da empresa (site, Instagram, LinkedIn, Facebook)
- POST com: company_name, company_site? (hint)
- Output: `{ success, data: DiscoverResult }`
- DiscoverResult: company_site, instagram, linkedin, facebook, other_sources[], confidence (high/medium/low)

### Passo 2.5: `get-perplexity-config/functionSpec.md`

**Conteudo (resumo):**
- Proposito: Retorna config completa do Perplexity
- GET | Publica
- Mascara API key (so mostra ultimos 4 chars)
- Indica `api_key_source` (database / env_var / none)

### Passo 2.6: `update-perplexity-config/functionSpec.md`

**Conteudo (resumo):**
- Proposito: Atualiza campos editaveis da config Perplexity
- PATCH | Publica
- Validacao: search_mode in [web], search_recency_filter in [hour,day,week,month,year], temperature 0-2, top_p 0-1, timeout_ms 1000-60000, insights_count 1-10
- Template suggest: valida presenca de placeholders obrigatorios (${company_name}, ${company_site}, ${celebrity_name})

---

## Fase 3 — Testes unitarios para modulos shared (estimativa: 2-3h)

### Passo 3.1: `_shared/perplexity/normalize.test.ts` (novo)

**Cenarios:**
1. `extractJsonObject` — JSON direto valido
2. `extractJsonObject` — JSON com texto antes/depois (best-effort)
3. `extractJsonObject` — resposta sem JSON retorna null
4. `normalizeProviderResponse` — resposta valida com briefing + 4 insights
5. `normalizeProviderResponse` — resposta sem content lanca NormalizeError
6. `normalizeProviderResponse` — JSON sem `briefing` lanca NormalizeError
7. `normalizeProviderResponse` — insights_pecas com < 4 itens lanca NormalizeError
8. `normalizeProviderResponse` — citacoes com URLs invalidas sao filtradas
9. `normalizeInsight` — campos ausentes viram string vazia
10. `normalizeBriefingObject` — pontos_prova filtra strings vazias

### Passo 3.2: `_shared/perplexity/prompt.test.ts` (novo)

**Cenarios:**
1. `buildUserPrompt` — resolve todos os placeholders obrigatorios
2. `buildUserPrompt` — linhas condicionais omitidas quando valor vazio
3. `buildUserPrompt` — insights_count clamped 1-10
4. `buildUserPrompt` — custom template com override
5. `buildPerplexityPayload` — payload completo com defaults
6. `buildPerplexityPayload` — payload com config DB override

### Passo 3.3: `_shared/perplexity/discover.test.ts` (novo)

**Cenarios:**
1. `buildDiscoverUserPrompt` — inclui company name e schema
2. `buildDiscoverUserPrompt` — inclui hint de site quando fornecido
3. `buildDiscoverPayload` — payload completo
4. `normalizeDiscoverResponse` — resposta com todos os perfis = confidence high
5. `normalizeDiscoverResponse` — resposta com 1 perfil = confidence medium
6. `normalizeDiscoverResponse` — resposta vazia = confidence low
7. `normalizeDiscoverResponse` — URLs invalidas sao descartadas
8. `normalizeDiscoverResponse` — other_sources com tipo invalido = 'other'

### Passo 3.4: `_shared/perplexity/client.test.ts` (novo)

**Cenarios:**
1. `loadDbConfig` — retorna config do banco
2. `loadDbConfig` — retorna null quando tabela vazia
3. `loadDbConfig` — cache hit no segundo call
4. `mapError` — AppError passthrough
5. `mapError` — ProviderHttpError → PERPLEXITY_PROVIDER_ERROR
6. `mapError` — erro generico → INTERNAL_ERROR

**Validacao:**
```bash
deno test supabase/functions/_shared/perplexity/ --allow-env --allow-net --allow-read
```

---

## Fase 4 — Seguranca das funcoes de config (estimativa: 1-2h)

### Passo 4.1: Adicionar autenticacao a `update-perplexity-config`

**Arquivo:** `supabase/functions/update-perplexity-config/index.ts`
**Acao:**
1. Importar `requireAuth` e `isAuthError` de `_shared/auth.ts`
2. Adicionar verificacao de auth antes do PATCH
3. Verificar role admin via `is_admin()` ou `is_admin_or_supervisor()`
4. Retornar 401/403 se nao autenticado/autorizado

**Impacto no deploy:** Remover `--no-verify-jwt` no proximo deploy desta funcao.

### Passo 4.2: Avaliar `get-perplexity-config`

**Decisao:** GET pode permanecer publico (so leitura, API key mascarada), mas documentar a decisao no functionSpec.

**Alternativa:** Se preferirem proteger, mesmo pattern do 4.1.

### Passo 4.3: Documentar classificacao JWT no CHECKLIST-DEPLOY

**Arquivo:** `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`
**Acao:** Atualizar com a classificacao das 6 funcoes Perplexity:
- `generate-campaign-briefing` — publica (--no-verify-jwt, auth interno via frontend token)
- `test-perplexity-briefing` — publica (sandbox dev)
- `suggest-briefing-seed` — publica (chamada do frontend)
- `discover-company-sources` — publica (chamada do frontend)
- `get-perplexity-config` — publica (leitura, key mascarada)
- `update-perplexity-config` — protegida (apos Fase 4.1)

---

## Fase 5 — Documentacao e registro (estimativa: 1h)

### Passo 5.1: Atualizar `CLAUDE.md` secao Edge Functions Registry

**Arquivo:** `CLAUDE.md`
**Acao:** Adicionar secao dedicada Perplexity no registry:

```markdown
**Perplexity (config):**
`get-perplexity-config`, `update-perplexity-config`

**Perplexity (geração):**
`generate-campaign-briefing`, `test-perplexity-briefing`, `suggest-briefing-seed`, `discover-company-sources`
```

### Passo 5.2: Atualizar `CLAUDE.md` secao _shared

**Arquivo:** `CLAUDE.md`
**Acao:** Expandir a referencia a `perplexity/` na estrutura de `_shared/`:

```markdown
│           ├── perplexity/       # Perplexity AI integration
│           │   ├── client.ts     # Shared provider client, errors, config loader
│           │   ├── prompt.ts     # Briefing prompt builder
│           │   ├── normalize.ts  # Response normalization + JSON extraction
│           │   ├── suggest.ts    # Briefing seed suggestion
│           │   └── discover.ts   # Company digital profile discovery
```

### Passo 5.3: Atualizar `ai-step2/CONTRACT.md`

**Arquivo:** `ai-step2/CONTRACT.md`
**Acao:** Adicionar secao documentando o provider Perplexity:

```markdown
## Provider: Perplexity Sonar

O pipeline usa Perplexity Sonar como provider de IA com search grounding.

### Config
- Tabela: `perplexity_config` (singleton)
- Funcoes: `get-perplexity-config` (GET), `update-perplexity-config` (PATCH)
- Resolucao: env var → DB → hardcoded default

### Edge Functions
- `generate-campaign-briefing` — briefing completo (JSON: briefing + insights_pecas)
- `suggest-briefing-seed` — sugestao de texto de briefing (texto corrido)
- `discover-company-sources` — descoberta de perfis digitais
- `test-perplexity-briefing` — sandbox de testes com historico

### Shared Modules
- `_shared/perplexity/client.ts` — provider HTTP client, config loader, error classes
- `_shared/perplexity/prompt.ts` — prompt builder para briefing
- `_shared/perplexity/normalize.ts` — normalizacao de resposta + JSON extraction
- `_shared/perplexity/suggest.ts` — prompt + normalizacao para suggest
- `_shared/perplexity/discover.ts` — prompt + normalizacao para discover
```

### Passo 5.4: Atualizar `plan/README.md`

**Arquivo:** `plan/README.md`
**Acao:** Adicionar entrada para este plano.

---

## Fase 6 — Melhorias opcionais (estimativa: 2-3h, baixa prioridade)

### Passo 6.1: Padronizar DI nas demais funcoes

**Objetivo:** Exportar `handleRequest(req, deps)` em `test-perplexity-briefing`, `discover-company-sources`, `suggest-briefing-seed` — seguindo o pattern de `generate-campaign-briefing`.

**Beneficio:** Permite testes unitarios com mock de `callProvider` sem HTTP real.

### Passo 6.2: Structured logging

**Objetivo:** Padronizar logs no formato `[function.event]` com campos `compra_id`, `provider`, `model`, `duration_ms`, `error_code`.

Exemplo:
```
[discover.request.received] { company_name: "Acme", model: "sonar" }
[discover.provider.succeeded] { company_name: "Acme", confidence: "high", duration_ms: 3200 }
```

### Passo 6.3: Retry com backoff para erros transitórios

**Objetivo:** Implementar retry (max 1 retry, backoff 2s) em `callProvider` para erros HTTP 429 e 503 do Perplexity.

**Cuidado:** Respeitar o timeout total da Edge Function (max ~25s em producao).

---

## Ordem de execucao recomendada

| Ordem | Fase | Pré-requisito | Deploy necessário |
|-------|------|---------------|-------------------|
| 1 | Fase 1 (Shared Client) | Nenhum | Sim — redeploy das 4 funcoes |
| 2 | Fase 3 (Testes) | Fase 1 | Nao |
| 3 | Fase 2 (functionSpecs) | Fase 1 | Nao |
| 4 | Fase 5 (Documentacao) | Fases 1-3 | Nao |
| 5 | Fase 4 (Seguranca config) | Fase 1 | Sim — redeploy update-perplexity-config |
| 6 | Fase 6 (Opcionais) | Fase 1 | Sim se DI/retry implementados |

**Total estimado:** 9-13h de trabalho (excluindo Fase 6 opcional).

---

## Criterios de aceite

- [ ] Zero duplicacao de `callProvider`, `loadDbConfig`, `AppError`, `ProviderHttpError` entre Edge Functions
- [ ] `generate-campaign-briefing` importa `normalizeProviderResponse` de `_shared/perplexity/normalize.ts`
- [ ] 6 functionSpec.md criados e revisados
- [ ] Cobertura de testes: normalize.test.ts, prompt.test.ts, discover.test.ts, client.test.ts
- [ ] Todos os testes passando: `deno test supabase/functions/_shared/perplexity/ --allow-env --allow-net --allow-read`
- [ ] `update-perplexity-config` exige auth (admin/supervisor)
- [ ] CLAUDE.md, CONTRACT.md e plan/README.md atualizados
- [ ] 4 Edge Functions reduzidas para ~80-120 linhas (vs 200-400+ atuais)
