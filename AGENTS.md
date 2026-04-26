# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository Structure

`primeiro-passo-app` is a **standalone React + Vite SPA** (onboarding flow) backed by Supabase Edge Functions and an AI campaign pipeline:

```
primeiro-passo-app/
├── src/                          # React + Vite SPA (onboarding)
│   ├── pages/                    # Etapa1Hero → EtapaFinal + AiStep2Monitor
│   ├── components/               # Shared UI components
│   ├── context/                  # OnboardingContext (state across steps)
│   ├── lib/                      # Utilities (color-extractor, ai-step2-validation)
│   ├── theme/                    # Design tokens, colors, global CSS
│   └── copy.js                   # Content copy for onboarding steps
├── supabase/
│   ├── migrations/               # Schema migrations (never edit existing ones)
│   └── functions/                # 26 Edge Functions (Deno) + _shared/
│       └── _shared/              # Shared Deno utilities
│           ├── cors.ts           # CORS + jsonResponse
│           ├── auth.ts           # JWT auth helpers
│           ├── activity-logger.ts
│           ├── audit-logger.ts
│           ├── service-role-auth.ts
│           ├── operational-events*.ts
│           ├── email/            # Resend provider
│           ├── perplexity/       # Perplexity AI integration
│           │   ├── client.ts     # Shared provider client, errors, config loader
│           │   ├── prompt.ts     # Briefing prompt builder
│           │   ├── normalize.ts  # Response normalization + JSON extraction
│           │   ├── suggest.ts    # Briefing seed suggestion
│           │   └── discover.ts   # Company digital profile discovery
│           ├── ai-campaign/      # AI campaign eligibility, image-generator, etc.
│           ├── nanobanana/       # NanoBanana config types, loader, constants
│           │   └── config.ts     # NanoBananaDbConfig, loadNanoBananaConfig, CategoryKey, DirectionMode
│           ├── enrichment/      # Onboarding enrichment pipeline shared modules
│           │   ├── config.ts         # EnrichmentConfig loader (re-exports config-types.ts)
│           │   ├── config-types.ts   # EnrichmentConfig interface, constants, resolvePromptTemplate
│           │   ├── gemini-client.ts  # callGeminiText with retry + bytesToBase64
│           │   ├── color-extractor.ts # extractColorsFromImage, extractColorsViaGemini, extractColorsFromCss
│           │   ├── css-scraper.ts    # fetchAndParseCss, extractFontsFromCss
│           │   └── font-detector.ts  # detectAndValidateFont (waterfall: CSS → Gemini → fallback)
│           └── admin-auth.ts     # Admin password guard (x-admin-password header)
├── ai-step2/                     # AI Campaign Pipeline docs
│   ├── PRD.md                    # Product requirements
│   ├── BACKLOG.md                # Feature backlog
│   └── CONTRACT.md               # Pipeline contract
├── docs/                            # Reference documentation
│   └── mapeamento-formulario-onboarding.md  # Canonical form-to-DB mapping
├── .context/modules/
│   ├── onboarding/              # Onboarding context engineering
├── .cursor/
│   ├── rules/                    # Always-apply Cursor rules (MDC)
│   ├── skills/                   # Cursor skills (SKILL.md per skill)
│   └── commands/                 # Cursor slash commands
├── plan/                         # Feature plans (YYYY-MM-DD-slug.md)
├── tasks/                        # Operational tasks (TASK-YYYY-MM-DD-NNN-slug.md)
├── scripts/                      # Utilities
├── package.json                  # name: "primeiro-passo-app"
└── .env.example
```

## Common Commands

### Onboarding App (React + Vite)

```bash
npm ci               # Install dependencies from lockfile
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm run gate:prepush # Lockfile + deps + lint + build gate
```

### Package Manager Policy (npm-only)

- Official package manager: `npm` (declared in `package.json#packageManager`)
- Official lockfile: `package-lock.json` (single lockfile policy)
- Forbidden lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `bun.lock`, `npm-shrinkwrap.json`
- Before push/deploy, run `npm run gate:prepush`
- Any dependency change in `package.json` must include the updated `package-lock.json` in the same change

### Supabase

```bash
supabase functions serve                                              # Dev local Edge Functions
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt  # Deploy (ALWAYS include --project-ref)
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt  # Deploy public function
supabase db reset                                                      # Reset + apply migrations
```

**Supabase project ref:** `awqtzoefutnfmnbomujt` — required on every deploy command.

**Mandatory deploy protocol:**

1. **Before deploy:** classify the function as public or protected. If uncertain, ask before proceeding.
2. **Public functions** require `--no-verify-jwt`; **protected functions** must NOT use it.
3. **After deploy:** confirm CLI returned success (`Deployed Functions on project`).

### Deno Tests (Edge Functions)

```bash
deno test supabase/functions/<function>/ --allow-env --allow-net --allow-read
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
```

## Onboarding App

React 19 + Vite SPA (Vercel project: **onboarding-primeiro-passo**).

**Flow:** Etapa1Hero → Etapa2 → Etapa3 → Etapa4 → Etapa5 → Etapa6 / Etapa62 → EtapaFinal → TudoPronto

- When the client saves identity with `site_url` or `instagram_handle`, `save-onboarding-identity` triggers the **enrichment pipeline** (`onboarding-enrichment`): extracts colors/font, generates briefing via Perplexity, and creates AI campaign job. Config in singleton table `enrichment_config`.
- State is managed by `OnboardingContext` in `src/context/`
- `AiStep2Monitor` page — AI campaign monitoring panel (sub-pages: Garden, PostGen, NanoBanana config)
- No TypeScript — project uses JSX/JS
- Design tokens in `src/theme/design-tokens.js`; brand: primary `#384ffe` (Acelerai Blue), destructive `#ff0058`; font: Inter (Google Fonts CDN)

**Vercel Deploy:**

- Root Directory: `.` (repo root)
- Canonical URL: `https://onboarding-primeiro-passo.vercel.app`
- Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## AI Campaign Pipeline

Documented in `ai-step2/`. The pipeline generates personalized AI marketing campaigns after onboarding completion.

**Edge Functions (AI Campaign):**
- `create-ai-campaign-job` — trigger campaign generation
- `get-ai-campaign-status` / `get-ai-campaign-monitor` — polling
- `generate-campaign-briefing` / `save-campaign-briefing` / `suggest-briefing-seed` / `test-perplexity-briefing`
- `generate-ai-campaign-image` / `retry-ai-campaign-assets`
- `discover-company-sources` / `read-nanobanana-reference`
- `get-perplexity-config` / `update-perplexity-config`
- `get-nanobanana-config` / `update-nanobanana-config`

## Supabase Critical Rules

### RLS (Row Level Security) — Avoid Infinite Recursion

**NEVER** query RLS-protected tables inside policy definitions. This causes `42P17: infinite recursion detected`.

```sql
-- CORRECT: Use SECURITY DEFINER helper functions
CREATE POLICY "..." ON tabela FOR SELECT USING (public.is_admin_or_supervisor());

-- WRONG: Direct subquery on protected table
CREATE POLICY "..." ON tabela FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

Available helper functions: `is_admin()`, `is_admin_or_supervisor()`, `is_active_user()`, `get_user_role(uuid)`, `get_user_status(uuid)`

### Copy do Onboarding

- Tabela `onboarding_copy` é singleton (1 row). Sempre UPDATE, nunca INSERT.
- `copy.js` continua como fallback. Funções template nunca vão para o Supabase.
- Etapas consomem copy via `useCopy()` hook do `CopyContext.jsx`.
- Deploy ambas funções com `--no-verify-jwt`.

### Migrations

**Never edit existing migrations.** Always create new migration files for schema changes.

### Edge Functions Authentication

The default `verify_jwt: true` validates JWT before code runs, causing "401 with empty logs". For functions called by frontend:

```typescript
// CORRECT: Use shared auth module
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { requireAuth, isAuthError } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult.error;
  const { user, serviceClient } = authResult;
  // ...
});
```

### User Signup Trigger

The `handle_new_user` trigger MUST create BOTH:

1. Record in `profiles` (user data)
2. Record in `user_roles` (for RLS)

Without `user_roles`, the `is_agent()` function fails silently and users see blank screens.

### User Management

- Roles oficiais do dashboard: `admin`, `operator`, `viewer`.
- `profiles.status = disabled` deve ser sincronizado com ban no Supabase Auth.
- Helpers RLS: `is_admin()`, `is_admin_or_operator()`, `is_active_user()`, `get_user_role(uuid)`.
- Nunca rebaixar/desativar/excluir o unico admin; admins tambem nao podem excluir a propria conta.
- Edge Functions de user management usam JWT + `_shared/rbac.ts` e sao protegidas (sem `--no-verify-jwt`).

## Edge Functions Registry

> **Deploy:** Always include `--project-ref awqtzoefutnfmnbomujt`. Confirm public vs protected before deploying.

**Onboarding:**
`get-onboarding-data`, `save-onboarding-identity`

**Enrichment (pipeline automatico):**
`onboarding-enrichment`, `get-enrichment-status`, `get-enrichment-config`, `update-enrichment-config`

**AI Campaign Pipeline:**
`create-ai-campaign-job`, `get-ai-campaign-status`, `get-ai-campaign-monitor`, `save-campaign-briefing`, `generate-ai-campaign-image`, `retry-ai-campaign-assets`, `read-nanobanana-reference`

**Perplexity (geracao):**
`generate-campaign-briefing`, `test-perplexity-briefing`, `suggest-briefing-seed`, `discover-company-sources`

**Perplexity (config):**
`get-perplexity-config`, `update-perplexity-config`

**NanoBanana (config):**
`get-nanobanana-config`, `update-nanobanana-config`

**User Management:**
`list-users`, `invite-user`, `update-user-role`, `set-user-status`, `delete-user`

**Onboarding Copy (CMS):**
`get-onboarding-copy`, `update-onboarding-copy`


## Code Style

- **ESLint** + **Prettier**: no semicolons, single quotes, 2 spaces, trailing comma es5, **printWidth 100**, arrowParens always, endOfLine LF
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` — use scopes: `feat(onboarding):`, `feat(ai-campaign):`
- Unused vars prefixed with `_` are allowed (`@typescript-eslint/no-unused-vars` ignores `^_`)
- **Acelerai brand:** primary `#384ffe` (Acelerai Blue), destructive `#ff0058` (RED CRM). Font: Inter (Google Fonts CDN)

### TypeScript (Edge Functions — Deno)

- Target: `ES2022`, Deno standard library
- Edge Functions use Deno imports with URL specifiers or import maps
- Logger is `silent` in test environment automatically

## Onboarding Context (Formulario "Primeiro Passo")

When working on onboarding code (form steps, identity, briefing, post-onboarding pipeline), consult:

1. `.context/modules/onboarding/DOC-READING-ORDER.md` — identifies which docs to read for each task type
2. `.context/modules/onboarding/README.md` — module overview, flow, tables, edge functions
3. `.context/modules/onboarding/BUSINESS-RULES.md` — 15 critical business rules
4. `docs/mapeamento-formulario-onboarding.md` — **canonical reference**: all form fields, step-by-step mapping, database columns, storage, validations
5. `supabase/functions/<function>/index.ts` — implementation of the target function

**Key constraint:** The form has no JWT authentication. All onboarding Edge Functions are public (`--no-verify-jwt`). Security relies on UUID non-guessability.

## NanoBanana Context (Creative Direction Config)

NanoBanana is the configuration module for AI creative direction (3 categories: moderna, clean, retail). When working on NanoBanana code, consult:

1. `supabase/functions/<function>/functionSpec.md` — SDD specs for get/update/read functions
2. `_shared/nanobanana/config.ts` — Single source of truth for types, constants, and singleton loader
3. `_shared/admin-auth.ts` — Shared admin password guard used by update/read endpoints

**Key architecture:**

- **Singleton table:** `nanobanana_config` (exactly 1 row) — all config fields
- **Storage bucket:** `nanobanana-references` — reference images per category
- **Shared module:** `_shared/nanobanana/config.ts` — `NanoBananaDbConfig`, `loadNanoBananaConfig()`, `CategoryKey`, `DirectionMode`, `VALID_CATEGORIES`, `VALID_DIRECTION_MODES`, `CONFIG_TABLE`, `REFERENCE_BUCKET`
- **Auth:** `update-nanobanana-config` and `read-nanobanana-reference` are protected via `x-admin-password` header (`_shared/admin-auth.ts`). `get-nanobanana-config` is public (read-only).

**JWT classification for deploy:**

| Function | JWT | Auth |
|----------|-----|------|
| `get-nanobanana-config` | `--no-verify-jwt` | Public (read-only) |
| `update-nanobanana-config` | `--no-verify-jwt` | `x-admin-password` in code |
| `read-nanobanana-reference` | `--no-verify-jwt` | `x-admin-password` in code |

All 3 functions deploy with `--no-verify-jwt` because the frontend has no JWT/login system. Write endpoints enforce `x-admin-password` header at the application level.

## SDD Convention (functionSpec.md)

Some Edge Functions use Spec Driven Development: a `functionSpec.md` file alongside `index.ts` defines the function's contract. Check for existing specs before modifying Aurea Garden or NanoBanana functions.

## Plan Convention

Feature plans go in `plan/` with naming `YYYY-MM-DD-slug.md`. Update `plan/README.md` when adding a new plan. Historical/completed plans go in `plan/historico/`.

## Task Convention

Operational tasks (bugs, requests, fixes) go in `tasks/` with naming `TASK-YYYY-MM-DD-NNN-slug.md`. Archived tasks go in `tasks/arquivo/`. Use skill `task-enricher` to enrich tasks with context before execution.

## Cursor Skills Available

| Skill                 | Trigger                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `nova-tarefa`         | /nova-tarefa + relato → cria e enriquece tarefa operacional completa |
| `task-enricher`       | Enriquecer tarefa operacional existente, preparar para execução      |
| `sdd-spec-creator`   | Criar/documentar functionSpec.md (SDD) para qualquer componente      |

## AI Agent Workflow

### When to Edit What

- `src/` — React SPA (onboarding flow). No TypeScript; use JSX.
- `supabase/functions/` — Edge Functions (Deno). Deploy via Supabase CLI.
- `supabase/migrations/` — Database schema. Never edit existing migrations; create new ones.
- `ai-step2/` — AI campaign pipeline docs and contracts.
- `AGENTS.md` — Update when adding new cross-repo patterns and critical operational rules.
- `plan/` — Feature plans (`YYYY-MM-DD-slug.md`). Keep `plan/README.md` in sync.
- `tasks/` — Operational tasks (`TASK-YYYY-MM-DD-NNN-slug.md`). Enrich with skill `task-enricher`.
- `docs/` — Reference documentation (form mapping, etc.). Update `mapeamento-formulario-onboarding.md` when adding/removing form fields.
- `.context/modules/onboarding/` — Onboarding module documentation and business rules.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
