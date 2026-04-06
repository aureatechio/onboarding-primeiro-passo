# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│   └── functions/                # 31 Edge Functions (Deno) + _shared/
│       └── _shared/              # Shared Deno utilities
│           ├── cors.ts           # CORS + jsonResponse
│           ├── auth.ts           # JWT auth helpers
│           ├── activity-logger.ts
│           ├── audit-logger.ts
│           ├── service-role-auth.ts
│           ├── operational-events*.ts
│           ├── omie/             # OMIE utilities (canonical-os-payload, etc.)
│           ├── pipeline/         # trigger-nfe.ts
│           ├── email/            # Resend provider
│           ├── perplexity/       # Perplexity AI integration
│           │   ├── client.ts     # Shared provider client, errors, config loader
│           │   ├── prompt.ts     # Briefing prompt builder
│           │   ├── normalize.ts  # Response normalization + JSON extraction
│           │   ├── suggest.ts    # Briefing seed suggestion
│           │   └── discover.ts   # Company digital profile discovery
│           ├── ai-campaign/      # AI campaign eligibility, image-generator, etc.
│           └── garden/           # Garden validation
├── ai-step2/                     # AI Campaign Pipeline docs
│   ├── PRD.md                    # Product requirements
│   ├── BACKLOG.md                # Feature backlog
│   └── CONTRACT.md               # Pipeline contract
├── .context/modules/omie/        # OMIE integration context engineering
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
npm install          # Install dependencies
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

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

**Flow:** Etapa1Hero → Etapa2 → Etapa3 → Etapa4 → Etapa5 → Etapa6 / Etapa62 → Etapa7 → EtapaFinal → TudoPronto

- State is managed by `OnboardingContext` in `src/context/`
- `AiStep2Monitor` page — AI campaign monitoring panel (sub-pages: Garden, PostGen, PostTurbo, NanoBanana config)
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
- `generate-ai-campaign-image` / `retry-ai-campaign-assets` / `post-gen-generate` / `post-turbo-generate`
- `discover-company-sources` / `read-nanobanana-reference`
- `get-garden-job` / `list-garden-jobs` / `get-garden-options`
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

## Edge Functions Registry

> **Deploy:** Always include `--project-ref awqtzoefutnfmnbomujt`. Confirm public vs protected before deploying.

**Onboarding:**
`get-onboarding-data`, `save-onboarding-identity`

**AI Campaign Pipeline:**
`create-ai-campaign-job`, `get-ai-campaign-status`, `get-ai-campaign-monitor`, `save-campaign-briefing`, `generate-ai-campaign-image`, `retry-ai-campaign-assets`, `read-nanobanana-reference`

**Perplexity (geracao):**
`generate-campaign-briefing`, `test-perplexity-briefing`, `suggest-briefing-seed`, `discover-company-sources`

**Perplexity (config):**
`get-perplexity-config`, `update-perplexity-config`

**Aurea Garden (Post Gen + Post Turbo):**
`post-gen-generate`, `post-turbo-generate`, `list-garden-jobs`, `get-garden-options`, `get-garden-job`

**NanoBanana (config):**
`get-nanobanana-config`, `update-nanobanana-config`

**OMIE (fluxo automatico):**
`omie-orchestrator`, `omie-create-os`

**OMIE (correcao):**
`omie-upsert-os`, `omie-upsert-os-batch`, `omie-upsert-service`

**OMIE (vendedores):**
`omie-push-vendedores`, `omie-sync-vendedores`

**OMIE (config):**
`get-omie-nfse-config`, `update-omie-nfse-config`

## Code Style

- **ESLint** + **Prettier**: no semicolons, single quotes, 2 spaces, trailing comma es5, **printWidth 100**, arrowParens always, endOfLine LF
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` — use scopes: `feat(onboarding):`, `fix(omie):`, `feat(ai-campaign):`
- Unused vars prefixed with `_` are allowed (`@typescript-eslint/no-unused-vars` ignores `^_`)
- **Acelerai brand:** primary `#384ffe` (Acelerai Blue), destructive `#ff0058` (RED CRM). Font: Inter (Google Fonts CDN)

### TypeScript (Edge Functions — Deno)

- Target: `ES2022`, Deno standard library
- Edge Functions use Deno imports with URL specifiers or import maps
- Logger is `silent` in test environment automatically

## OMIE Integration Context

When working on OMIE-related code, consult these docs in order:

1. `.context/modules/omie/DOC-READING-ORDER.md` — identifies which docs to read for each task type
2. `.context/modules/omie/README.md` — internal architecture and patterns
3. `.context/modules/omie/BUSINESS-RULES.md` — critical business logic not in specs
4. `supabase/functions/<function>/functionSpec.md` — spec of the target function
5. Related plans in `plan/`

## Aurea Garden Context (Post Gen + Post Turbo)

When working on Aurea Garden code (image generation, gallery, NanoBanana config), consult:

1. `.context/modules/aurea-garden/DOC-READING-ORDER.md` — identifies which docs to read for each task type
2. `.context/modules/aurea-garden/README.md` — architecture, data flow, database schema
3. `.context/modules/aurea-garden/BUSINESS-RULES.md` — 15 critical business rules extracted from code
4. `supabase/functions/<function>/functionSpec.md` — spec of the target function
5. `.cursor/skills/aurea-garden/SKILL.md` — specialist playbook

All Garden Edge Functions are **public** (deploy with `--no-verify-jwt`).

## SDD Convention (functionSpec.md)

Some Edge Functions use Spec Driven Development: a `functionSpec.md` file alongside `index.ts` defines the function's contract. Check for existing specs before modifying OMIE, NFe, or Aurea Garden functions.

## Plan Convention

Feature plans go in `plan/` with naming `YYYY-MM-DD-slug.md`. Update `plan/README.md` when adding a new plan. Historical/completed plans go in `plan/historico/`.

## Task Convention

Operational tasks (bugs, requests, fixes) go in `tasks/` with naming `TASK-YYYY-MM-DD-NNN-slug.md`. Archived tasks go in `tasks/arquivo/`. Use skill `task-enricher` to enrich tasks with context before execution.

## Cursor Skills Available

| Skill                 | Trigger                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `omie-integracao`     | OMIE API, payload, clientes/serviços/OS integration                  |
| `aurea-garden`        | Post Gen, Post Turbo, geracao de criativos IA, galeria, NanoBanana   |
| `nova-tarefa`         | /nova-tarefa + relato → cria e enriquece tarefa operacional completa |
| `task-enricher`       | Enriquecer tarefa operacional existente, preparar para execução      |

## AI Agent Workflow

### When to Edit What

- `src/` — React SPA (onboarding flow). No TypeScript; use JSX.
- `supabase/functions/` — Edge Functions (Deno). Deploy via Supabase CLI.
- `supabase/migrations/` — Database schema. Never edit existing migrations; create new ones.
- `ai-step2/` — AI campaign pipeline docs and contracts.
- `CLAUDE.md` — Update when adding new cross-repo patterns and critical operational rules.
- `plan/` — Feature plans (`YYYY-MM-DD-slug.md`). Keep `plan/README.md` in sync.
- `tasks/` — Operational tasks (`TASK-YYYY-MM-DD-NNN-slug.md`). Enrich with skill `task-enricher`.
- `.context/modules/omie/` — OMIE module documentation and architecture context.
- `.context/modules/aurea-garden/` — Aurea Garden (Post Gen + Post Turbo) module documentation.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     