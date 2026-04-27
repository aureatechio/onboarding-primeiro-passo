# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Communication

- Always respond to the user in Brazilian Portuguese (`pt-BR`), unless the user explicitly requests another language.

## Repository Structure

`primeiro-passo-app` is a standalone React + Vite SPA for onboarding, backed by Supabase Edge Functions and internal admin tooling.

```text
primeiro-passo-app/
├── src/                    # React SPA (onboarding + internal dashboards)
├── supabase/
│   ├── migrations/         # Postgres schema migrations (immutable)
│   └── functions/          # Edge Functions (Deno) + _shared/
├── ai-step2/               # AI campaign pipeline docs
├── docs/                   # Product and technical reference docs
│   └── context/            # Canonical module context docs
├── .claude/                # Local agent commands and skills kept in-repo
├── plan/                   # Feature plans
├── tasks/                  # Operational tasks
├── scripts/                # Repo utilities
├── package.json
├── package-lock.json
├── deno.json
└── deno.lock
```

## Common Commands

### Onboarding App

```bash
npm ci
npm run dev
npm run build
npm run lint
npm run preview
npm run gate:prepush
```

### Package Manager Policy

- Official package manager: `npm`
- Official lockfile: `package-lock.json`
- Before push/deploy, run `npm run gate:prepush`
- Any dependency change in `package.json` must include the updated `package-lock.json`
- Do not add `pnpm-lock.yaml`, `yarn.lock`, `bun.lock*`, or `npm-shrinkwrap.json`

### Supabase

```bash
supabase functions serve
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase db reset
```

Project ref: `awqtzoefutnfmnbomujt`

Deploy protocol:

1. Classify the function as public or protected before deploying.
2. Public functions require `--no-verify-jwt`.
3. Protected functions must not use `--no-verify-jwt`.
4. Confirm CLI success output: `Deployed Functions on project`.

### Deno Tests

```bash
deno test supabase/functions/<function>/ --allow-env --allow-net --allow-read
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
```

## Frontend App

React 19 + Vite SPA deployed on Vercel at `https://onboarding-primeiro-passo.vercel.app`.

Public onboarding flow:

`Etapa1Hero -> Etapa2 -> Etapa3 -> Etapa4 -> Etapa5 -> Etapa6 / Etapa62 -> EtapaFinal -> TudoPronto`

Internal authenticated routes live in the same bundle:

- `/ai-step2/*` — AI campaign monitor and config screens
- `/copy-editor` — onboarding copy CMS
- `/users` and `/profile` — user management and profile
- `/login`, `/forgot-password`, `/reset-password` — auth entrypoints

Important frontend facts:

- No TypeScript in the main app code; JSX/JS is the default
- `src/copy.js` is the static fallback copy source
- `src/context/CopyContext.jsx` merges Supabase copy overrides over `copy.js`
- `src/context/AuthContext.jsx` powers internal dashboard auth
- `App.jsx` uses manual route handling, not `react-router`
- Design tokens live in `src/theme/design-tokens.js`
- Password recovery callbacks must use `VITE_DASHBOARD_URL` as the canonical base for `/reset-password`; do not rely only on `window.location.origin`, because local requests can generate `localhost` recovery links.
- Supabase Auth URL Configuration for production must allow `https://onboarding-primeiro-passo.vercel.app/reset-password` and must not use `localhost` as the production Site URL. Localhost redirect URLs are only acceptable for intentional local development.

## Supabase Critical Rules

### Supabase Auth Email Templates

- Auth email templates live in `supabase/templates/*.html`.
- All Supabase Auth email templates must be light-first: light page background, white content card, dark body text, light informational/warning panels, and magenta `#E8356D` only for the primary CTA/link accent.
- Do not create dark email templates. The only allowed dark block is the compact black logo header required to display the official white/transparent Acelerai logo with enough contrast.
- For the Acelerai logo inside these templates, use the public Supabase Storage URL for `public/logo_acelerai_white_transp.png` in the `<img src>`: `https://awqtzoefutnfmnbomujt.supabase.co/storage/v1/object/public/cdn-assets/acelerai/logo_acelerai_white_transp.png`.
- Do not use relative paths like `../../public/...` or `data:image/png;base64,...` URIs for the email logo; relative paths break in Supabase email rendering, and Gmail does not reliably render `data:` images in HTML email.
- Keep `alt="Acelerai"` and a fixed visual width around `156px` unless the design spec changes.

### Migrations

Never edit an existing migration. Always create a new migration file.

### RLS

Never query RLS-protected tables directly inside policy definitions. Use `SECURITY DEFINER` helpers such as:

- `is_admin()`
- `is_admin_or_operator()`
- `is_active_user()`
- `get_user_role(uuid)`
- `get_user_status(uuid)`

### User Signup Trigger

The `handle_new_user` trigger must create both:

1. A row in `profiles`
2. A row in `user_roles`

Without `user_roles`, RBAC-based access breaks.

### User Management

- Official roles: `admin`, `operator`, `viewer`
- `viewer` is the default role for new users
- `profiles.status = disabled` must stay aligned with Supabase Auth ban state
- Do not demote, disable, or delete the only remaining admin
- Admins must not delete their own account

## Edge Function Groups

### Public onboarding functions

- `get-onboarding-data`
- `save-onboarding-identity`
- `save-onboarding-progress`

The onboarding form has no JWT login. Public access relies on non-guessable purchase UUIDs.

### Protected onboarding admin function

- `set-onboarding-access`

This function is JWT-protected via RBAC and must not be deployed with `--no-verify-jwt`.

### Enrichment pipeline

- `onboarding-enrichment` — public
- `get-enrichment-status` — public
- `get-enrichment-config` — public
- `update-enrichment-config` — protected

`save-onboarding-identity` triggers enrichment when `site_url` or `instagram_handle` is saved.

### AI campaign pipeline

- `create-ai-campaign-job` — public
- `get-ai-campaign-status` — public
- `get-ai-campaign-monitor` — protected
- `generate-ai-campaign-image` — protected
- `retry-ai-campaign-assets` — protected
- `generate-campaign-briefing` — protected
- `save-campaign-briefing` — protected
- `suggest-briefing-seed` — protected
- `test-perplexity-briefing` — protected
- `discover-company-sources` — protected
- `get-perplexity-config` — protected
- `update-perplexity-config` — protected

### NanoBanana

Singleton config for creative direction categories `moderna`, `clean`, and `retail`.

- `get-nanobanana-config` — public, deploy with `--no-verify-jwt`
- `update-nanobanana-config` — protected in code by `x-admin-password`, deploy with `--no-verify-jwt`
- `read-nanobanana-reference` — protected in code by `x-admin-password`, deploy with `--no-verify-jwt`

Source of truth: `supabase/functions/_shared/nanobanana/config.ts`

### Onboarding Copy CMS

- `get-onboarding-copy` — public
- `update-onboarding-copy` — protected via JWT + RBAC admin

Rules:

- `onboarding_copy` is a singleton table
- Always `UPDATE`, never `INSERT`
- `copy.js` remains the fallback
- Template functions stay in code, not in Supabase content

## Canonical Docs To Read

When working on onboarding code, use these current docs:

1. `docs/context/onboarding/DOC-READING-ORDER.md`
2. `docs/context/onboarding/README.md`
3. `docs/context/onboarding/BUSINESS-RULES.md`
4. `docs/mapeamento-formulario-onboarding.md`
5. `supabase/functions/<function>/index.ts`

When working on user management:

1. `docs/context/user-management/README.md`
2. `docs/context/user-management/BUSINESS-RULES.md`
3. `supabase/functions/_shared/rbac.ts`
4. `supabase/functions/<function>/functionSpec.md`

When working on NanoBanana:

1. `supabase/functions/<function>/functionSpec.md`
2. `supabase/functions/_shared/nanobanana/config.ts`
3. `supabase/functions/_shared/admin-auth.ts`

## Repo Conventions

- Some Edge Functions use SDD via `functionSpec.md`; read it before changing the function
- `enrichment_config`, `nanobanana_config`, `perplexity_config`, and `onboarding_copy` are singleton tables
- `src/` is the SPA, `supabase/functions/` is backend logic, `supabase/migrations/` is schema history
- Update `docs/mapeamento-formulario-onboarding.md` when form fields change
- Update `plan/README.md` when adding a new feature plan
- Tasks live in `tasks/` as `TASK-YYYY-MM-DD-NNN-slug.md`

## Agent Resources In Repo

This repository keeps agent-oriented resources in two parallel locations:

- `.claude/commands/`, `.claude/skills/` — consumed by Claude Code
- `.agents/skills/` — consumed by Codex

They are useful as repo documentation assets, but the current source of truth for product behavior remains the code and the `docs/` directory.

### Skills mirror: `.claude/skills/` ↔ `.agents/skills/`

Both folders must contain the same set of skills. A Claude Code PostToolUse hook (configured in `.claude/settings.json`) runs `scripts/mirror-skills.sh` after every Write/Edit/MultiEdit and rsyncs the source tree to the mirror folder (no `--delete`, so deletions never propagate automatically).

- When editing a skill via Claude Code, the mirror is automatic.
- When editing a skill via Codex (or any other tool that does not run Claude Code's hooks), run `bash scripts/mirror-skills.sh < /dev/null` is NOT enough — the script reads `tool_input.file_path` from stdin. Instead, run rsync manually:

  ```bash
  # propagate any pending change from Codex side to Claude side
  rsync -a .agents/skills/ .claude/skills/
  ```

- To rename or remove a skill, perform the operation in BOTH folders manually.
