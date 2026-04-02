# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

AUREA is a **pnpm 10 + Turborepo** monorepo with TypeScript/Node.js projects (Node >= 20):

```
aurea/
├── apps/
│   ├── onboarding/        # React + Vite onboarding SPA ("Primeiro Passo") — porta 5173
│   ├── omie/              # Express 5 backend (CRM → OMIE ERP)
│   └── checkout-cielo/    # Static SPA (Vanilla JS) + E2E tests for Edge Functions
├── packages/
│   ├── shared/            # Logger, validators, errors, supabase client, checkout-contracts
│   ├── tsconfig/          # Shared TS configs
│   └── eslint-config/     # Shared ESLint/Prettier config
├── supabase/
│   ├── migrations/        # Consolidated migrations (never edit existing ones)
│   └── functions/         # Edge Functions (Deno) + _shared/
├── .context/
│   └── modules/           # Module docs (checkout, clicksign, dashboard, nfe, omie, shared)
├── .cursor/
│   ├── rules/             # Always-apply Cursor rules (MDC)
│   └── skills/            # Cursor skills (SKILL.md per skill)
├── docs/                  # Cross-cutting docs (deploy classification, email provider, etc.)
├── plan/                  # Feature plans (YYYY-MM-DD-slug.md naming convention)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

| App | Package | Purpose |
|-----|---------|---------|
| `primeiro-passo-app` | `apps/onboarding` | React + Vite onboarding SPA (Vercel project: **onboarding-primeiro-passo**) — porta **5173** |
| `@aurea/omie` | `apps/omie` | CRM → OMIE ERP integration backend (Express 5 + axios) |
| `@aurea/checkout-cielo` | `apps/checkout-cielo` | Static checkout SPA + Vitest E2E tests against live Edge Functions |

> **Nota:** `apps/dashboard/` existe no repositório com alguns fragmentos de código e artefatos de build de uma implementação anterior que foi descontinuada. Não há código fonte ativo no dashboard — ignorar para fins de desenvolvimento.

All apps share Supabase (PostgreSQL + Auth) as the backend infrastructure.

## Common Commands

### Root (all apps)
```bash
pnpm install             # Install all dependencies
pnpm dev                 # Run all apps in dev mode
pnpm build               # Build all apps
pnpm test                # Run all tests (includes Deno tests for Edge Functions)
pnpm typecheck           # TypeScript check all
pnpm lint                # Lint all
```

### Specific App
```bash
pnpm --filter primeiro-passo-app dev   # Run onboarding in dev mode (port 5173)
pnpm --filter @aurea/omie dev          # Run omie in dev mode (tsx watch)
pnpm --filter @aurea/shared build      # Build shared package (must build before dependents)
```

### Testing
```bash
# Unit tests
pnpm --filter @aurea/omie test              # Run omie unit tests

# Integration tests (omie only — separate config with 30s timeout)
pnpm --filter @aurea/omie test:integration

# E2E checkout tests
pnpm --filter @aurea/checkout-cielo test              # All checkout E2E
pnpm --filter @aurea/checkout-cielo test:split         # Split tests (--maxWorkers=1 to avoid races)
pnpm --filter @aurea/checkout-cielo test:recurrence    # Recurrence tests

# Deno tests (Edge Functions)
deno test supabase/functions/process-checkout/handlers --allow-env --allow-net --allow-read
```

### Supabase
```bash
supabase functions serve                                            # Dev local Edge Functions
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt  # Deploy (ALWAYS include --project-ref)
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt  # Deploy public function
supabase db reset                                                    # Reset + apply migrations
```

**Supabase project ref:** `awqtzoefutnfmnbomujt` — required on every deploy command.

**Mandatory deploy protocol:**
1. **Before deploy:** consult `docs/edge-functions-publicas-e-protegidas.md` to classify the function as public or protected. If the function is not listed, ask before proceeding.
2. **Public functions** require `--no-verify-jwt`; **protected functions** must NOT use it.
3. **Batch deploys:** consult `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`.
4. **After deploy:** confirm CLI returned success (`Deployed Functions on project`).

## Supabase Critical Rules

### RLS (Row Level Security) - Avoid Infinite Recursion
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

## Checkout Critical Rules

- **PCI-DSS:** `process-checkout` only accepts `PaymentToken` from SOP — never raw `CardNumber`, `SecurityCode`, `ExpirationDate`
- **Split rollback:** boleto parcelado and dual payment must rollback fully (child sessions + group) on failure
- **NFS-e trigger in splits:** fire only when ALL split sessions are paid
- **payment-visibility.ts sync:** changes to `_shared/payment-visibility.ts` must be mirrored in `apps/checkout-cielo/src/payment-visibility.js`
- **PIX discount:** changes must be made in both `create-checkout` and `get-checkout-session`
- **cielo-webhook:** Always `--no-verify-jwt`. Cielo sends webhooks without JWT; with `verify_jwt=true` the gateway returns 401 and the handler never executes

## Edge Functions (_shared modules)

Shared utilities in `supabase/functions/_shared/`:

| Module | Purpose |
|--------|---------|
| `cors.ts` | CORS handling (`handleCors`, `jsonResponse`) |
| `auth.ts` | JWT auth (`requireAuth`, `isAuthError`) |
| `activity-logger.ts` | Centralized activity logging (checkout + contract events) |
| `audit-logger.ts` | Audit trail logging |
| `security-logger.ts` | Security event logging |
| `validation.ts` | Input validation helpers |
| `decline-mapping.ts` | Payment decline code mapping |
| `rate-limit.ts` | Rate limiting |
| `turnstile.ts` | Cloudflare Turnstile verification |
| `idempotency.ts` | Idempotency helpers |
| `checkout-contracts.ts` | Shared Zod-free validation contracts |
| `checkout-status.ts` | Checkout status helpers |
| `payment-visibility.ts` | Payment method visibility (**must sync with `apps/checkout-cielo/src/`**) |
| `split.ts` | Split trigger decision (`shouldTriggerOmieEmission`) |
| `boleto-parcelado.ts` | Boleto parcelado utilities |
| `lead-stage.ts` | Lead stage management |
| `pix-discount.ts` | PIX discount logic |
| `service-role-auth.ts` | Service role JWT decode auth (`requireServiceRole`) |
| `pipeline/` | Pipeline triggers (`trigger-nfe.ts`) |
| `omie/` | OMIE utilities (`canonical-os-payload.ts`) |

## Code Style

- **ESLint** + **Prettier**: no semicolons, single quotes, 2 spaces, trailing comma es5, **printWidth 100**, arrowParens always, endOfLine LF
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` — use scopes: `feat(checkout):`, `fix(omie):`, `feat(onboarding):`
- **Zod 4** for validation, **Pino** for logging (backends), **Express 5** for HTTP servers, **Vitest** for testing
- Unused vars prefixed with `_` are allowed (`@typescript-eslint/no-unused-vars` ignores `^_`)
- `@typescript-eslint/no-explicit-any` is `warn` (prefer `unknown`)
- **Acelerai brand:** primary `#384ffe` (Acelerai Blue), destructive `#ff0058` (RED CRM). Font: Inter (Google Fonts CDN).

### TypeScript
- Target: `ES2022`, strict mode + `noUncheckedIndexedAccess: true` (stricter than standard strict)
- Backend apps (`omie`) use `module: NodeNext` — ESM imports must use `.js` extensions even for `.ts` source
- Logger is `silent` in test environment automatically

## Shared Package (@aurea/shared)

The `packages/shared` package provides common utilities (peer dep: `zod@^4`):

```typescript
import { createLogger } from '@aurea/shared/logger'
import { validateCPF, validateCNPJ, validateDocument, validateEmail, validateCEP, validatePhone, onlyDigits, normalizeDocument } from '@aurea/shared/validators'
import { maskCpfCnpj, maskApiKey, maskDocument } from '@aurea/shared/mask'
import { ServiceError, NotFoundError, TimeoutError, ValidationError, AuthenticationError, ExternalApiError, isAbortError } from '@aurea/shared/errors'
import { createSupabaseClient } from '@aurea/shared/supabase'

// Checkout contracts (shared between Edge Functions)
import { ProcessCheckoutRequestContract, CieloWebhookPayloadContract, validateProcessCheckoutContract, PROCESSABLE_PAYMENT_METHODS } from '@aurea/shared/checkout-contracts'
```

## Vercel Deploy (Onboarding)

Onboarding uses a **dedicated Vercel project**: `onboarding-primeiro-passo`.
- Root Directory: `apps/onboarding`
- Canonical URL: `https://onboarding-primeiro-passo.vercel.app`
- `installCommand`: `npm i -g corepack@latest && corepack enable && corepack prepare --activate && pnpm install` (without `corepack prepare --activate`, Vercel's bundled pnpm causes `ERR_PNPM_OUTDATED_LOCKFILE`)
- Required env vars: `ENABLE_EXPERIMENTAL_COREPACK=1`, `VITE_SUPABASE_URL`
- Common CI error: `ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE` when `pnpm-lock.yaml` is outdated/incompatible; sync and commit lockfile before redeploy.

## Resend Email Provider

Resend is the standard transactional email provider (used by `send-checkout-link-email`).
- Required env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (or `CHECKOUT_EMAIL_FROM`), optionally `RESEND_REPLY_TO`
- Never log `RESEND_API_KEY`; use idempotency when there is retry risk
- Reference: `docs/resend-email-provider.md`

## Pre-PR Checklist

Run before opening a PR: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

## SDD Convention (functionSpec.md)

Some Edge Functions use Spec Driven Development: a `functionSpec.md` file alongside `index.ts` defines the function's contract. Check for existing specs before modifying OMIE or NFe functions.

## OMIE Integration Context

When working on OMIE-related code, consult these docs in order:
1. `.context/modules/omie/DOC-READING-ORDER.md` — identifies which docs to read for each task type
2. `.context/modules/omie/README.md` — internal architecture and patterns
3. `.context/modules/omie/BUSINESS-RULES.md` — critical business logic not in specs
4. `supabase/functions/<function>/functionSpec.md` — spec of the target function
5. Related plans in `plan/`

## Plan Convention

Feature plans go in `plan/` with naming `YYYY-MM-DD-slug.md`. Update `plan/README.md` when adding a new plan.

## Project-Specific Documentation

Each app may contain:
- `AGENTS.md` - AI agent instructions and critical patterns (see `apps/omie/AGENTS.md`, `apps/checkout-cielo/AGENTS.md`)
- `prd.md` or `PRD.md` - Product requirements
- `BACKLOG.md` or `backlog.md` - Feature backlog

Cross-cutting docs:
- `.context/modules/` — module docs (checkout, clicksign, nfe, omie, shared)
- `docs/edge-functions-publicas-e-protegidas.md` — public vs protected Edge Functions classification
- `docs/resend-email-provider.md` — email provider reference
- `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md` — batch deploy checklist

## Edge Functions Registry

> **Deploy:** Always include `--project-ref awqtzoefutnfmnbomujt`. Check `docs/edge-functions-publicas-e-protegidas.md` for JWT classification.

**Payment/Checkout:** `create-checkout`, `process-checkout`, `process-checkout-direct`, `process-payment`, `check-payment-status`, `generate-pix`, `generate-boleto`, `generate-sop-token`, `generate-3ds-token`, `get-checkout-session`, `get-checkout-config`, `update-checkout-config`, `dev-credentials`, `create-boleto-parcelado`, `create-split-from-session`, `cielo-webhook`, `checkout-audit-alerts`, `reconcile-pending-payments`, `send-checkout-link-email`, `apply-discount`, `delete-transaction`, `export-dashboard-data`

**Recurrence:** `create-recurrence`, `get-recurrence`, `list-recurrences`, `admin-recurrences`, `recurrences-dashboard`, `process-recurrence`, `pause-recurrence`, `resume-recurrence`, `cancel-recurrence`, `update-recurrence-card`, `notify-recurrence`, `notify-precharge-cron`, `recurrence-webhook`

**OMIE (fluxo automatico):** `omie-orchestrator`, `omie-create-client`, `omie-create-service`, `omie-create-os`

**OMIE (correcao):** `omie-upsert-os`, `omie-preview-upsert-os`, `omie-upsert-service`

**OMIE (batch):** `omie-upsert-os-batch`, `omie-fix-os-parcelas`, `omie-fix-os-parcelas-batch`, `omie-fix-contas-receber`, `omie-fix-contas-receber-batch`, `omie-backfill-client-address`, `omie-backfill-client-address-batch`

**OMIE (retry):** `omie-nfse-retry-worker`

**OMIE (vendedores):** `omie-push-vendedores`, `omie-sync-vendedores`

**OMIE (config):** `get-omie-nfse-config`, `update-omie-nfse-config`

**ClickSign:** `trigger-clicksign`, `clicksign-download-signed-document`, `webhook-clicksign`, `resend-clicksign-notification`, `replace-clicksign-signer`

**AI Config:** `get-perplexity-config`, `update-perplexity-config`, `get-nanobanana-config`, `update-nanobanana-config`

**Admin/Infra:** `admin-config`, `admin-logs`, `log-frontend-activity`, `test-credentials`

## External API Integration

| Service | App / Functions | Documentation |
|---------|-----------------|---------------|
| OMIE ERP | @aurea/omie, `omie-*` Edge Functions | [Portal OMIE](https://app.omie.com.br/developer/) |
| Cielo/Braspag Payments | `checkout-*`, `process-*`, `generate-*` Edge Functions | [API Cielo](https://developercielo.github.io/manual/cielo-ecommerce) |
| ClickSign v3 | `trigger-clicksign`, `webhook-clicksign`, `clicksign-download-signed-document`, `resend-clicksign-notification`, `replace-clicksign-signer` | `.context/modules/clicksign/README.md` |
| Resend | `send-checkout-link-email` Edge Function | `docs/resend-email-provider.md` |

## AI Agent Workflow

### When to Edit What

- `apps/` — Business logic, routes, services. Each app may define app-specific patterns in `AGENTS.md`.
- `packages/shared/` — Cross-cutting utilities. Run `pnpm --filter @aurea/shared build` after changes.
- `supabase/functions/` — Edge Functions. For deploy, prefer Supabase CLI (`supabase functions deploy <name>`).
- `supabase/migrations/` — Database schema. Never edit existing migrations; create new ones.
- `CLAUDE.md` — Update when adding new cross-repo patterns and critical operational rules.
- `plan/` — Feature plans and PRDs (`YYYY-MM-DD-slug.md`) and keep `plan/README.md` in sync.
- `tasks/` — Tarefas operacionais (bugs, pedidos, correções). Usar `TASK-YYYY-MM-DD-NNN-slug.md`. Enriquecer com skill `task-enricher`.
- `.context/` — Module documentation and architecture context.

### Cursor Skills Available

| Skill | Trigger |
|-------|---------|
| `ai-context-specialist` | ai-context, PREVC, workflow, scaffold, fill, sync |
| `omie-integracao` | OMIE API, clientes/contatos integration |
| `nova-tarefa` | /nova-tarefa + relato → cria e enriquece tarefa operacional completa |
| `task-enricher` | Enriquecer tarefa operacional existente, preparar para execução, tasks/ |
| `sdd-function-spec` | SDD, Spec Driven Development, functionSpec.md |
| `module-context-creator` | .context/modules/ documentation |
| `vercel-deploy` | Vercel deploy, build errors, monorepo config |
| `edge-function-deploy` | Deploy de Edge Functions, gate pre-deploy, validacao JWT |
| `mintlify` | Mintlify docs, MDX, docs.json |

### AI Context References

- Documentation index: `.context/docs/README.md`
- Module docs: `.context/modules/README.md`
- Skills: `.context/skills/README.md`
- Plans: `.context/plans/README.md`
- Tasks: `tasks/README.md` (operational tasks, PREVC-aligned lifecycle)
- Per-app guides: `apps/omie/AGENTS.md`, `apps/checkout-cielo/AGENTS.md`
