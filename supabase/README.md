# Supabase — Primeiro Passo

Backend do app **Primeiro Passo (Onboarding Acelerai)**. Concentra schema do banco (migrations Postgres) e Edge Functions (Deno) que sustentam o fluxo de onboarding, o pipeline de enriquecimento, a geração de campanhas de IA (AI Step 2) e os CMSs internos (copy, Perplexity, NanoBanana).

> **Project ref:** `awqtzoefutnfmnbomujt` — obrigatório em **todos** os comandos de deploy.

---

## Estrutura da pasta

```
supabase/
├── migrations/          # Schema Postgres (9 migrations, imutáveis)
└── functions/           # Edge Functions (Deno) + _shared/
    └── _shared/         # Bibliotecas compartilhadas entre functions
```

Não há `config.toml` commitado — a configuração de runtime vem do projeto remoto (`awqtzoefutnfmnbomujt`). A pasta `.temp/` é gerenciada pela CLI e **não** versionada.

---

## `migrations/`

Migrations ficam em ordem cronológica (`YYYYMMDDHHMMSS_slug.sql`). **Nunca edite uma migration existente** — sempre crie uma nova.

| Arquivo | Descrição |
|---|---|
| `20260407000000_update_nanobanana_sacred_face_v1_1_0.sql` | Alavanca B: reformulação do preset Sacred Face com safe zones; bump `v1.1.0`. |
| `20260407120000_update_nanobanana_sacred_face_v1_1_1.sql` | Hotfix da alavanca B: reverte instrução "leave safe zone empty"; bump `v1.1.1` para invalidar hashes. |
| `20260408100000_add_identity_site_instagram.sql` | Adiciona `site_url` e `instagram_handle` em `onboarding_identity` (gatilho do enrichment). |
| `20260408100001_create_enrichment_jobs.sql` | Cria `onboarding_enrichment_jobs` (fila/estado do pipeline de enriquecimento). |
| `20260408100002_create_enrichment_config.sql` | Cria `enrichment_config` (singleton, 1 row). |
| `20260409100000_add_nanobanana_gemini_params.sql` | Parâmetros Gemini em `nanobanana_config` (`temperature`, `top_p`, `top_k`, `safety_preset`, `use_system_instruction`). |
| `20260410100000_create_onboarding_access.sql` | `onboarding_access` (estado 1:1 por compra) + histórico imutável de eventos — desacopla "autorização de onboarding" de "pagamento". |
| `20260414100000_create_onboarding_copy.sql` | `onboarding_copy` singleton + versionamento — permite CS/Legal editar copy sem deploy. |
| `20260414120000_create_onboarding_progress.sql` | `onboarding_progress` (1 row por compra, timestamps por etapa + aceites de quiz). |

### Tabelas principais resultantes

- **Onboarding:** `onboarding_identity`, `onboarding_access`, `onboarding_progress`, `onboarding_copy`
- **Enrichment:** `onboarding_enrichment_jobs`, `enrichment_config`
- **AI Campaign / NanoBanana:** `nanobanana_config` (singleton)
- **Perplexity:** `perplexity_config` (singleton, criada em migration anterior fora desta pasta)

### Regras críticas de RLS

Políticas **nunca** devem consultar diretamente tabelas protegidas (gera `42P17: infinite recursion`). Use sempre as funções `SECURITY DEFINER`:

- `is_admin()`, `is_admin_or_supervisor()`, `is_active_user()`
- `get_user_role(uuid)`, `get_user_status(uuid)`

---

## `functions/` — Edge Functions (Deno)

As funções são organizadas por domínio. Toda função segue o padrão:

```ts
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'  // quando protegida

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  // ...
})
```

Várias pastas possuem `functionSpec.md` (SDD — Spec Driven Development). **Sempre consulte o spec antes de modificar a função.**

### 1. Onboarding (formulário "Primeiro Passo")

| Função | JWT | Propósito |
|---|---|---|
| `get-onboarding-data` | público | Hidrata o formulário a partir do `compra_id`. |
| `save-onboarding-identity` | público | Persiste identidade (nome, empresa, site, Instagram). Dispara **enrichment** quando há `site_url` ou `instagram_handle`. |
| `save-onboarding-progress` | público | Atualiza timestamps de etapa em `onboarding_progress`. |
| `set-onboarding-access` | protegido (admin) | Concede/revoga acesso ao onboarding por compra. |

> O formulário não tem login JWT; segurança se apoia na não-adivinhabilidade do UUID de compra.

### 2. Enrichment Pipeline

Extrai cores/fonte do site do cliente, gera briefing via Perplexity e enfileira job de campanha IA.

| Função | JWT | Propósito |
|---|---|---|
| `onboarding-enrichment` | público | Orquestrador — chamado por `save-onboarding-identity`. Tem `functionSpec.md`. |
| `get-enrichment-status` | público | Status do job de enrichment por compra. |
| `get-enrichment-config` | público | Lê singleton `enrichment_config`. |
| `update-enrichment-config` | protegido (admin) | Atualiza config (prompt templates, fallbacks, feature flags). |

### 3. AI Campaign Pipeline (AI Step 2)

Gera imagens e campanhas de marketing pós-onboarding. Docs em `ai-step2/`.

| Função | JWT | Propósito |
|---|---|---|
| `create-ai-campaign-job` | público | Cria o job principal de campanha. |
| `get-ai-campaign-status` | público | Polling de status para o cliente. |
| `get-ai-campaign-monitor` | protegido | Painel administrativo (AiStep2Monitor). |
| `generate-ai-campaign-image` | protegido | Dispara geração de imagem via NanoBanana/Gemini. |
| `retry-ai-campaign-assets` | protegido | Re-tenta assets falhos. |

### 4. Perplexity (briefing de campanha)

| Função | JWT | Propósito |
|---|---|---|
| `generate-campaign-briefing` | protegido | Gera briefing principal da campanha. |
| `save-campaign-briefing` | protegido | Persiste o briefing editado. |
| `suggest-briefing-seed` | protegido | Sugere seed inicial do briefing. |
| `test-perplexity-briefing` | protegido (admin) | Playground para CS/Ops. |
| `discover-company-sources` | protegido | Descobre presença digital da empresa. |
| `get-perplexity-config` | protegido | Lê singleton. |
| `update-perplexity-config` | protegido (admin) | Atualiza prompts, modelo, temperatura. |

### 5. NanoBanana (direção criativa de IA)

Config de 3 categorias: `moderna`, `clean`, `retail`. Todas com `--no-verify-jwt`; `update` e `read` são protegidas por `x-admin-password` em código (ver `_shared/admin-auth.ts`).

| Função | Auth |
|---|---|
| `get-nanobanana-config` | público (read-only) |
| `update-nanobanana-config` | `x-admin-password` |
| `read-nanobanana-reference` | `x-admin-password` |

### 6. Onboarding Copy (CMS)

| Função | JWT | Propósito |
|---|---|---|
| `get-onboarding-copy` | público | Lê a copy atual do singleton. |
| `update-onboarding-copy` | protegido (admin) | Publica nova versão (com histórico). |

---

## `functions/_shared/`

Bibliotecas reutilizadas por múltiplas Edge Functions.

| Módulo | Conteúdo |
|---|---|
| `cors.ts` | `handleCors`, `jsonResponse` — resposta padrão + preflight. |
| `auth.ts`* | `requireAuth`, `isAuthError` — valida JWT Supabase em functions protegidas. |
| `admin-auth.ts` | Guarda de header `x-admin-password` para endpoints administrativos sem JWT. |
| `service-role-auth.ts` | Cliente Supabase com service role (bypass RLS) para functions internas. |
| `activity-logger.ts` | Log de atividades de negócio. |
| `audit-logger.ts` | Trilha de auditoria. |
| `operational-events*.ts` | Eventos operacionais + labels + mensagens (com testes). |
| `email/` | `resend-provider.ts` + `audit.ts` + `types.ts` — integração Resend. |
| `perplexity/` | `client.ts`, `prompt.ts`, `normalize.ts`, `suggest.ts`, `discover.ts` (todos com `*.test.ts`). |
| `ai-campaign/` | `eligibility.ts`, `image-generator.ts`, `prompt-builder.ts`, `logger.ts` (com testes). |
| `enrichment/` | `config.ts`, `config-types.ts`, `gemini-client.ts`, `color-extractor.ts`, `css-scraper.ts`, `font-detector.ts` (com testes + `__tests__/`). |
| `nanobanana/` | `config.ts` — **single source of truth**: `NanoBananaDbConfig`, `loadNanoBananaConfig`, `CategoryKey`, `DirectionMode`, `VALID_CATEGORIES`, `VALID_DIRECTION_MODES`, `CONFIG_TABLE`, `REFERENCE_BUCKET`. |

\* Arquivos referenciados pelo CLAUDE.md; podem residir em outros shared helpers dependendo da convenção.

---

## Comandos

### Dev local

```bash
supabase functions serve
```

### Deploy (sempre com project-ref)

```bash
# Função protegida (JWT Supabase)
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt

# Função pública (sem JWT — onboarding, NanoBanana)
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

**Protocolo obrigatório:**

1. Classificar a função como pública ou protegida antes de deployar.
2. Confirmar no output da CLI: `Deployed Functions on project`.

### Banco

```bash
supabase db reset   # aplica todas as migrations em ordem
```

### Testes Deno

```bash
deno test supabase/functions/<function>/ --allow-env --allow-net --allow-read
deno test supabase/functions/_shared/   --allow-env --allow-net --allow-read
```

---

## Convenções

- **SDD:** funções com `functionSpec.md` têm contrato formal — leia antes de editar.
- **Public vs Protected:** onboarding e NanoBanana são **públicas**. Perplexity, enrichment-writes e AI Campaign admin são **protegidas**.
- **Singletons:** `enrichment_config`, `nanobanana_config`, `perplexity_config`, `onboarding_copy` têm exatamente 1 linha — **sempre UPDATE**, nunca INSERT.
- **Migrations:** imutáveis após merge. Novas mudanças → nova migration.
- **RLS:** use sempre helpers `SECURITY DEFINER`. Nunca subquery direto em tabela protegida dentro de policy.
