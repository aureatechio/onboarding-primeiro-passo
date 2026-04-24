# Contrato Tecnico — ai-step2 P0

## 1. Elegibilidade (gate de entrada)

Fluxo de geracao so e habilitado quando:

```
compras.clicksign_status = 'Assinado'
AND (
  compras.checkout_status = 'pago'
  OR onboarding_access.status = 'allowed' (nao expirado)
)
```

Observacao: `vendaaprovada = true` isoladamente nao qualifica compra como elegivel para criacao de job. Porem, um admin pode liberar manualmente via `set-onboarding-access` (action=allow), que registra override rastreavel em `onboarding_access` + `onboarding_access_events`.

Resposta de bloqueio padrao:

```json
{ "success": false, "code": "NOT_ELIGIBLE", "reason": "compra_nao_paga | contrato_nao_assinado" }
```

## 2. Input contract (create-ai-campaign-job)

O orquestrador recebe apenas `compra_id` no body. Os demais inputs sao lidos diretamente do banco.

### Body (POST)

| Campo | Tipo | Origem |
|-------|------|--------|
| `compra_id` | uuid | body JSON |

### Dados lidos do banco (onboarding_identity + celebridadesReferencia + clientes)

| Dado | Tabela | Campo |
|------|--------|-------|
| Logo (signed URL) | `onboarding_identity` | `logo_path` -> bucket `onboarding-identity` |
| Paleta de cores | `onboarding_identity` | `brand_palette` |
| Fonte | `onboarding_identity` | `font_choice` |
| Notas de campanha | `onboarding_identity` | `campaign_notes` |
| Imagem de campanha (optional) | `onboarding_identity` | `campaign_images_paths[0]` -> bucket `onboarding-identity` |
| Foto celebridade | `celebridadesReferencia` | `fotoPrincipal` via `compras.celebridade` |
| Nome do cliente | `clientes` | `nome` / `nome_fantasia` |
| Nome da celebridade | `celebridadesReferencia` | `nome` |
| Global rules | Hardcoded | Constante `GLOBAL_RULES` no orquestrador |
| Briefing estruturado (opcional) | `onboarding_briefings` | `briefing_json` com `status = 'done'` (campos `objetivo_campanha`, `publico_alvo`, `tom_voz`, `mensagem_central`, `cta_principal`, `insights_pecas`) |

O orquestrador monta `PromptInput` com `briefing?: BriefingContext` e `insightsPecas?: InsightPeca[]` (ver `_shared/ai-campaign/prompt-builder.ts`). O `buildPrompt` adiciona secoes `## CAMPAIGN CONTEXT (from AI Briefing)` e, por variacao, `## CREATIVE DIRECTION (from AI Insights)` quando houver dados. Se nao houver briefing, o prompt segue como antes (retrocompativel). O `computeInputHashAsync` inclui `briefing` e `insightsPecas` no hash para idempotencia.

### Limites de input (configuraveis via env var)

| Limite | Env var | Default |
|--------|---------|---------|
| Max cores na paleta | `AI_CAMPAIGN_MAX_PALETTE_COLORS` | 8 |
| Max tamanho font_choice | `AI_CAMPAIGN_MAX_FONT_CHOICE_LENGTH` | 100 chars |
| Max tamanho campaign_notes | `AI_CAMPAIGN_MAX_NOTES_LENGTH` | 2000 chars |
| Max download de imagem | `AI_CAMPAIGN_MAX_IMAGE_DOWNLOAD_BYTES` | 15 MB |

## 3. Processamento (orchestrator + worker pattern)

### Orquestrador (`create-ai-campaign-job`)

```
1. Receber compra_id no body
2. Verificar elegibilidade (gate)
3. Ler identidade visual de onboarding_identity
4. Gerar signed URLs para logo/imagens
5. Carregar dados de celebridade e cliente
6. Verificar idempotencia (compra_id + input_hash)
7. Criar job (status=processing, total_expected=12)
8. Pre-criar 12 rows em ai_campaign_assets (status=pending)
9. Retornar {job_id, status: processing} ao chamador
10. Em background (EdgeRuntime.waitUntil):
    - Para cada asset: POST para generate-ai-campaign-image
    - Ao final: atualizar status do job (completed/partial/failed), reconciliando assets nao-terminais
```

### Worker (`generate-ai-campaign-image`)

```
1. Autenticar via requireServiceRole
2. Marcar asset como status=processing
3. Chamar generateImage (Gemini API com retries)
4. Se sucesso: upload no Storage, asset status=completed
5. Se falha: asset status=failed, inserir em ai_campaign_errors
6. Atualizar job.total_generated com count de assets completed
```

Retries: max 2 tentativas por chamada ao modelo com backoff exponencial (1s, 3s).

#### Reconciliacao e rastreabilidade de erro (P1)

- Falhas na chamada do worker agora tambem sao persistidas pelo orquestrador, para evitar job falho sem erro rastreavel.
- Em falha HTTP (`response.ok = false`) o asset e marcado como `failed` e registra erro `worker_http_error`.
- Em resposta invalida (`JSON` invalido ou `success=false`) o asset e marcado como `failed` e registra erro `worker_response_invalid`.
- Em excecoes de runtime/rede na chamada do worker o asset e marcado como `failed` e registra erro `worker_call_exception`.
- Excecoes nao tratadas dentro do proprio worker devem ser convertidas para resposta estruturada e erro `worker_unhandled_error` (sem deixar o asset em estado nao terminal).
- Ao finalizar o batch, assets ainda em `pending/processing` podem ser reconciliados para `failed` com erro `stale_processing_timeout` quando houver falhas no lote.
- Fechamento final do job deve considerar o snapshot completo de `ai_campaign_assets` do job (nao apenas o subconjunto despachado no ciclo atual).

## 4. Output contract

### Job

```typescript
interface AiCampaignJob {
  id: string           // uuid
  compra_id: string    // uuid FK
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  input_hash: string   // SHA-256 dos inputs canonizados
  prompt_version: string // semver do template de prompt
  total_expected: number // 12
  total_generated: number
  created_at: string
  updated_at: string
}
```

### Asset

```typescript
interface AiCampaignAsset {
  id: string           // uuid
  job_id: string       // uuid FK
  group_name: 'moderna' | 'clean' | 'retail'
  format: '1:1' | '4:5' | '16:9' | '9:16'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  image_url: string    // signed URL ou path no bucket
  width: number | null
  height: number | null
  prompt_version: string
  created_at: string
}
```

### Error

```typescript
interface AiCampaignError {
  id: string
  job_id: string
  group_name: string
  format: string
  error_type: string   // ex.: 'model_error' | 'upload_error' | 'worker_http_error' | 'worker_response_invalid' | 'worker_call_exception' | 'worker_unhandled_error' | 'stale_processing_timeout'
  error_message: string
  attempt: number
  created_at: string
}
```

## 5. Endpoints (Edge Functions)

### `save-onboarding-identity` (POST)

- Classificacao JWT: **publica** (`--no-verify-jwt`) — consumida pelo frontend onboarding.
- Aceita `multipart/form-data` ou `application/json`.
- Campos: `compra_id`, `choice` (`add_now`|`later`), `logo` (File), `brand_palette` (JSON string), `font_choice`, `campaign_images` (File[], max 5), `campaign_notes`, `site_url`, `instagram_handle`, `production_path` (legado).
- Faz upload de logo e imagens para bucket `onboarding-identity`.
- Upsert em tabela `onboarding_identity` (onConflict: `compra_id`).
- Se `site_url` **ou** `instagram_handle` estiver preenchido apos o upsert, dispara `onboarding-enrichment` em background (service role, fire-and-forget). Esse pipeline extrai cores/fonte, gera briefing via Perplexity e chama `create-ai-campaign-job` na fase final.
- Se houver `site_url` ou `instagram_handle`, o backend forca `production_path = 'standard'` no upsert.
- Retorna `{ success, data: { identity_id, logo_path, campaign_images_count } }`.

> **Nota:** O fluxo hibrido manual (Etapa 7 / `production_path: hybrid`) foi descontinuado no frontend. `save-campaign-briefing` permanece disponivel para compatibilidade ou fluxos operacionais, mas o caminho principal e enrichment + briefing automatico.

### `create-ai-campaign-job` (POST)

- Classificacao JWT: **publica no gateway** (`--no-verify-jwt`) com autenticacao **interna obrigatoria** via bearer service role.
- Recebe apenas `compra_id` no body JSON.
- Valida elegibilidade, le identidade visual do banco, cria job e 12 assets pending.
- Retorna `{ success, job_id, status: 'processing' }` imediatamente.
- Dispatcha workers em background via `EdgeRuntime.waitUntil`, delegando para `generate-ai-campaign-image` por chamada HTTP.
- Retorna `{ success, job_id, status }` se idempotente (job existente).

### `generate-ai-campaign-image` (POST)

- Classificacao JWT: **publica no gateway** (`--no-verify-jwt`) com autenticacao **interna obrigatoria** via bearer service role.
- Worker individual chamado pelo orquestrador.
- Recebe `job_id`, `asset_id`, `compra_id`, `group_name`, `format`, `celebrity_png_url`, `client_logo_url`, `campaign_image_url`, `prompt`.
- Gera 1 imagem via Gemini, faz upload no Storage, atualiza asset no banco.
- Retorna `{ success, asset_id, status }`.

### Trigger automatico da geracao (onboarding -> ai-step2)

- **Principal:** `save-onboarding-identity` dispara `onboarding-enrichment` quando `site_url` ou `instagram_handle` esta presente. O enrichment (4 fases) termina chamando `create-ai-campaign-job` com identidade ja enriquecida (`brand_palette`, `font_choice`) e, se sucesso na fase 3, `onboarding_briefings` com `briefing_json`.
- **Legado:** `save-campaign-briefing` pode ainda disparar `create-ai-campaign-job` em cenarios hibridos/operacionais (ver implementacao da funcao).
- Em todos os casos o trigger e fire-and-forget e nao bloqueia a resposta HTTP ao cliente.

### Pipeline de enrichment (referencia)

| Funcao | Metodo | Papel |
|--------|--------|-------|
| `onboarding-enrichment` | POST | Orquestra fases (cores, fonte, briefing, campanha); auth interna service role |
| `get-enrichment-status` | GET | Polling por `compra_id` |
| `get-enrichment-config` | GET | Le singleton `enrichment_config` |
| `update-enrichment-config` | POST | Atualiza singleton (guard admin conforme spec) |

Tabela `onboarding_enrichment_jobs` (1 row por `compra_id`, UNIQUE): status global, `phase_*_status` por fase, `phases_log` (jsonb), `campaign_job_id` opcional. Detalhe completo: `supabase/functions/onboarding-enrichment/functionSpec.md`.

### `get-ai-campaign-status` (GET)

- Classificacao JWT: **publica** (`--no-verify-jwt`) — consumida pelo frontend onboarding.
- Query param: `job_id` ou `compra_id`.
- Retorna job + assets[] + errors[].

### `get-ai-campaign-monitor` (GET)

- Classificacao JWT: **publica** (`--no-verify-jwt`) — consumida pela tela operacional do onboarding (`/ai-step2/monitor`).
- Modos suportados:
  - `mode=list` (ou sem `job_id`/`compra_id`): retorna visao geral paginada.
  - `mode=detail` (ou com `job_id`/`compra_id`): retorna payload detalhada atual.
- Query params de lista:
  - `page` (default `1`)
  - `limit` (default `20`, max `100`)
  - `status` (`pending | processing | completed | partial | failed`)
  - `q` (busca simples por `job_id`/`compra_id` quando UUID; fallback por `status`)
- Payload de lista:
  - `mode: "list"`
  - `items[]` com `job_id`, `compra_id`, `status`, `total_expected`, `total_generated`, `percent`, `created_at`, `updated_at`, `client_name`, `celebrity_name`
  - cada item inclui diagnostico operacional: `failed_assets_count`, `stuck_assets_count`, `last_error_type`, `last_error_at`, `has_inconsistency`, `inconsistency_flags[]`
  - `pagination` com `page`, `limit`, `total`, `total_pages`
  - `summary` com totais por status (`pending`, `processing`, `completed`, `partial`, `failed`) e `total`
  - `eligible_purchases[]` (retrocompativel) com pendencias aptas ao disparo, filtradas por elegibilidade
  - `available_purchases[]` com todas as vendas com contrato assinado (pagas e nao pagas), incluindo: `compra_id`, `label`, `eligible`, `eligibility_reason`, `checkout_status`, `clicksign_status`, `vendaaprovada`, `onboarding_access_status`
- Payload de detalhe:
  - `mode: "detail"` (implícito por estrutura atual)
  - `job` + `progress` (status/contadores)
  - `assets[]` (inclui `status` por asset), `errors[]`, `missing[]`
  - `diagnostics` com:
    - `status_counts` (`total`, `completed`, `failed`, `processing`, `pending`)
    - `worker_failures_count`
    - `inconsistency_flags[]` (ex.: `job_failed_with_processing_assets`, `job_failed_without_errors`, `failed_assets_without_error_records`)
    - `last_error` (`error_type`, `error_message`, `created_at`)
    - `last_failure_source` (`worker`, `provider`, `storage_upload`, `database`, `unknown`)
  - `onboarding.compra`, `onboarding.identity`, `onboarding.briefing`
  - signed URLs de uploads (`logo`, `imagens`, `audio`) e assets gerados
- Mantem rate-limit in-memory por IP (mesmo baseline do endpoint de status).

### `set-onboarding-access` (POST)

- Classificacao JWT: **publica** (`--no-verify-jwt`) com guard admin (`x-admin-password`).
- Objetivo: liberar, bloquear ou revogar acesso ao onboarding para uma compra.
- Body: `compra_id`, `action` (`allow|revoke|block`), `reason_code` (`negotiated_payment_terms|manual_exception|revoked_by_admin|other`), `notes` (opcional), `allowed_until` (opcional), `actor_id` (opcional).
- Faz UPSERT em `onboarding_access` e trigger grava evento em `onboarding_access_events`.
- Retorna `{ success, access, message }`.
- Ver `functionSpec.md` completo em `supabase/functions/set-onboarding-access/functionSpec.md`.

### `retry-ai-campaign-assets` (POST)

- Classificacao JWT: **publica** (`--no-verify-jwt`) com validacoes server-side de estado.
- Objetivo: reprocessar assets com falha ou regenerar assets concluidos para um `job_id` existente.
- Body:
  - `job_id` (obrigatorio)
  - `mode` opcional: `single | failed | category` (default `failed`)
  - `asset_id` obrigatorio quando `mode = single`
  - `group_name` obrigatorio quando `mode = category` (`moderna | clean | retail`)
- Regras:
  - `mode = failed`: retry permitido apenas para assets `failed`.
  - `mode = single`: regeneracao permitida para assets `completed` ou `failed`.
  - `mode = category`: regenera todos os assets (4 formatos) de um `group_name`, aceita `completed` ou `failed`.
  - Bloqueia retry quando houver assets `pending/processing` no job (`JOB_BUSY`).
  - Prepara assets alvo para `pending` e dispara `create-ai-campaign-job` para retomar processamento.
- Saida:
  - `success`, `job_id`, `compra_id`, `mode`, `retried_count`, `target_asset_ids[]`, status do disparo.
  - Inclui `group_name` na resposta quando `mode = category`.

## 6. Schema Supabase (migration)

### Identidade visual

```sql
CREATE TABLE onboarding_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL UNIQUE REFERENCES compras(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('add_now', 'later')),
  logo_path text,
  brand_palette text[] NOT NULL DEFAULT '{}',
  font_choice text,
  campaign_images_paths text[] DEFAULT '{}',
  campaign_notes text,
  site_url text,
  instagram_handle text,
  production_path text CHECK (production_path IS NULL OR production_path IN ('standard', 'hybrid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Pipeline de geracao

```sql
CREATE TABLE ai_campaign_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','partial','failed')),
  input_hash text NOT NULL,
  prompt_version text NOT NULL,
  total_expected integer NOT NULL DEFAULT 12,
  total_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_campaign_jobs_compra_hash
  ON ai_campaign_jobs (compra_id, input_hash);

CREATE TABLE ai_campaign_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES ai_campaign_jobs(id) ON DELETE CASCADE,
  group_name text NOT NULL CHECK (group_name IN ('moderna','clean','retail')),
  format text NOT NULL CHECK (format IN ('1:1','4:5','16:9','9:16')),
  image_url text NOT NULL,
  width integer,
  height integer,
  prompt_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_campaign_assets_job_group_format
  ON ai_campaign_assets (job_id, group_name, format);

CREATE TABLE ai_campaign_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES ai_campaign_jobs(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  format text NOT NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Controle de acesso ao onboarding

```sql
CREATE TABLE onboarding_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL UNIQUE REFERENCES compras(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'blocked'
    CHECK (status IN ('blocked', 'allowed', 'revoked')),
  reason_code text NOT NULL DEFAULT 'auto',
  notes text,
  allowed_until timestamptz,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE onboarding_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason_code text NOT NULL,
  notes text,
  actor_id text,
  actor_role text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Trigger `trg_onboarding_access_audit` grava evento automaticamente em INSERT/UPDATE.

## 7. Idempotencia

Chave: `compra_id` + `input_hash` (SHA-256 de inputs canonizados, incluindo `campaign_image_url`, `campaignNotes`, `briefing` e `insightsPecas` conforme `computeInputHashAsync` em `prompt-builder.ts`).

Se ja existe job com mesmo `compra_id + input_hash`:
- Se `status = 'completed'`: retornar resultado existente.
- Se `status = 'processing'`: retornar status atual.
- Se `status = 'failed'` ou `'partial'`: deletar job anterior (assets + errors + job) e criar novo.

## 8. Storage

### Bucket `ai-campaign-assets` (imagens geradas)

- Privado, signed URLs.
- Path: `{compra_id}/{job_id}/{group_name}_{format}.png`
- Politica: acesso via signed URL com expiracao parametrizavel (env `AI_CAMPAIGN_URL_EXPIRY_SECONDS`, default 7 dias).
- Storage policies: apenas `service_role` pode INSERT/SELECT no bucket.
- Acesso externo: exclusivamente via signed URLs geradas por `get-ai-campaign-status`.

### Bucket `onboarding-identity` (inputs do cliente)

- Privado, signed URLs.
- Path: `{compra_id}/logo.{ext}`, `{compra_id}/img_{i}.{ext}`
- Storage policies: apenas `service_role` pode INSERT/SELECT no bucket.
- Usado por `save-onboarding-identity` para upload e por `create-ai-campaign-job` para leitura via signed URL.

## 8.1. Observabilidade

- Logs estruturados JSON em todas as etapas via `_shared/ai-campaign/logger.ts`.
- Campos obrigatorios por log: `level`, `ts`, `stage`, `message`.
- Campos contextuais: `jobId`, `compraId`, `group`, `format`.
- Etapas rastreadas: `ingestion`, `eligibility`, `prompt`, `generation`, `upload`, `persistence`, `delivery`.

## 8.2. Rate-limit

- `get-ai-campaign-status`: rate-limit in-memory de 60 req/min por IP.
- Retorna 429 com `code: 'RATE_LIMITED'` quando excedido.

## 9. Grupos criativos (ruas.md)

| Grupo | Fundo | Celebridade | Layout | Tipografia | Referencia |
|-------|-------|-------------|--------|------------|------------|
| moderna | Preto/escuro | Hero 70-80% frame, cinematografico | Assimetrico, foto domina, texto na base | Ultra-bold condensed | Nike / poster de filme |
| clean | Branco puro | Foto limpa flutuando, canto direito | Split editorial 30/70 | Light/regular serif ou sans | Vogue / Apple |
| retail | Cor solida da marca | Cut-out em pe, lado direito | Geometrico duro, blocos e badges | All-caps condensed, maximo contraste | Casas Bahia / Magazine Luiza |

## 9.1. Referencia por categoria (NanoBanana Config)

Cada categoria (`moderna`, `clean`, `retail`) suporta configuracao independente com foco em texto final:

- `direction_<categoria>`: texto da direcao criativa
- `direction_<categoria>_image_path`: path no bucket `nanobanana-references`
- `direction_<categoria>_image_url`: signed URL temporaria para preview no monitor

### Shared Module

Tipos, constantes e loader do NanoBanana estao centralizados em `_shared/nanobanana/config.ts`:

- `NanoBananaDbConfig` — interface unica da tabela singleton
- `loadNanoBananaConfig(supabase)` — loader com cache in-memory
- `CategoryKey`, `DirectionMode` — type aliases
- `VALID_CATEGORIES`, `VALID_DIRECTION_MODES`, `CONFIG_TABLE`, `REFERENCE_BUCKET` — constantes

Consumidores: `create-ai-campaign-job`, `post-gen-generate`, `get-nanobanana-config`, `update-nanobanana-config`, `read-nanobanana-reference`.

### Autenticacao

| Funcao | JWT deploy | Auth aplicada |
|--------|-----------|---------------|
| `set-onboarding-access` | `--no-verify-jwt` | `x-admin-password` via `_shared/admin-auth.ts` |
| `get-nanobanana-config` | `--no-verify-jwt` | Nenhuma (leitura publica) |
| `update-nanobanana-config` | `--no-verify-jwt` | `x-admin-password` via `_shared/admin-auth.ts` |
| `read-nanobanana-reference` | `--no-verify-jwt` | `x-admin-password` via `_shared/admin-auth.ts` |

O guard `requireAdminPassword` valida o header `x-admin-password` contra env var `ADMIN_PASSWORD` (default: `megazord`).

### SDD (Spec Driven Development)

Todas as 3 functions NanoBanana possuem `functionSpec.md` ao lado do `index.ts`, documentando contrato completo (inputs, validations, behavior, response, error handling).

Regras de validacao no `update-nanobanana-config`:

- texto de direcao por categoria e obrigatorio para salvar
- imagem de referencia e opcional (serve de insumo para leitura por IA e rastreabilidade visual)

Leitura assistida por imagem:

- endpoint `read-nanobanana-reference` recebe `multipart/form-data` com:
  - `category`: `moderna|clean|retail`
  - `image`: arquivo PNG/JPG/WEBP
- resposta retorna `direction_text` no formato padrao de direcao criativa
- ao clicar em `Ler imagem` no frontend, o texto da categoria e sobrescrito diretamente

No pipeline de geracao:

- `create-ai-campaign-job` utiliza `direction_<categoria>` como fonte canonica de direcao
- o worker de geracao recebe prompt textual final por grupo/formato

## 10. Prompt version

Formato: `v1.x.y` (semver em `PROMPT_VERSION` em `_shared/ai-campaign/prompt-builder.ts`).
Incremento em minor quando mudar template de prompt; major quando mudar global-rules de forma incompativel.

### GLOBAL_RULES_VERSION

`GLOBAL_RULES_VERSION` e exportada em `_shared/ai-campaign/prompt-builder.ts`.
Incluida no calculo do `input_hash` junto com `PROMPT_VERSION` — qualquer mudanca invalida cache de idempotencia.

## 11. Variaveis de ambiente configuraveis

| Env var | Descricao | Default |
|---------|-----------|---------|
| `GEMINI_API_KEY` | Chave da API Gemini | (obrigatoria) |
| `GEMINI_MODEL_NAME` | Nome do modelo Gemini | `gemini-3-pro-image-preview` |
| `GEMINI_API_BASE_URL` | URL base da API Gemini | `https://generativelanguage.googleapis.com/v1beta` |
| `AI_CAMPAIGN_MAX_PALETTE_COLORS` | Max cores na paleta | `8` |
| `AI_CAMPAIGN_MAX_FONT_CHOICE_LENGTH` | Max chars em font_choice | `100` |
| `AI_CAMPAIGN_MAX_NOTES_LENGTH` | Max chars em campaign_notes | `2000` |
| `AI_CAMPAIGN_MAX_IMAGE_DOWNLOAD_BYTES` | Max bytes por download de imagem | `15728640` (15 MB) |
| `AI_CAMPAIGN_JOB_TIMEOUT_MS` | Timeout global do pipeline | `300000` (5 min) |
| `AI_CAMPAIGN_URL_EXPIRY_SECONDS` | Expiracao de signed URLs | `604800` (7 dias) |

## 12. Provider: Perplexity Sonar

O pipeline usa Perplexity Sonar como provider de IA com search grounding para geracao de briefings e descoberta de fontes.

### Config

- Tabela: `perplexity_config` (singleton)
- Funcoes: `get-perplexity-config` (GET), `update-perplexity-config` (PATCH)
- Resolucao de config: env var → DB → hardcoded default
- Cache de config em memoria com TTL de 5 minutos

### Edge Functions

| Funcao | Metodo | Proposito |
|--------|--------|-----------|
| `generate-campaign-briefing` | POST | Briefing completo (JSON: briefing + insights_pecas + citacoes) |
| `suggest-briefing-seed` | POST | Sugestao de texto de briefing (texto corrido, min 120 chars) |
| `discover-company-sources` | POST | Descoberta de perfis digitais (site, Instagram, LinkedIn, Facebook) |
| `test-perplexity-briefing` | GET/POST | Sandbox de testes com historico em perplexity_test_runs |

### Shared Modules (`_shared/perplexity/`)

| Modulo | Responsabilidade |
|--------|-----------------|
| `client.ts` | Provider HTTP client, config loader com TTL, error classes (AppError, ProviderHttpError), helpers |
| `prompt.ts` | Prompt builder para briefing (system prompt + user prompt template com placeholders) |
| `normalize.ts` | Normalizacao de resposta + JSON extraction best-effort |
| `suggest.ts` | Prompt + normalizacao para suggest seed (guard rail: min 120 chars) |
| `discover.ts` | Prompt + normalizacao para discover (confidence: high/medium/low) |

### Versionamento

Cada resposta normalizada carrega triple-versioning:
- `contract_version` — versao do schema de saida
- `prompt_version` — versao do prompt enviado ao provider
- `strategy_version` — versao da estrategia criativa

### Variaveis de ambiente

| Env var | Descricao | Default |
|---------|-----------|---------|
| `PERPLEXITY_API_KEY` | Chave da API Perplexity | (obrigatoria, pode ser via DB) |
| `PERPLEXITY_MODEL` | Nome do modelo | `sonar` |
| `PERPLEXITY_API_BASE_URL` | URL base da API | `https://api.perplexity.ai` |
| `PERPLEXITY_TIMEOUT_MS` | Timeout da chamada ao provider | `15000` (15s) |
