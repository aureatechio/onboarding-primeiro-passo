# Plano: Limpeza Pós-Extração do Monorepo

**Data:** 2026-04-06
**Status:** Pendente
**Estimativa:** ~3h de execução

---

## Situação Atual

O repo `primeiro-passo-app` foi extraído do monorepo AUREA mas a extração ficou incompleta. O git ainda rastreia **284 arquivos deletados** de `apps/omie`, `apps/dashboard`, `apps/checkout-cielo`, `apps/onboarding` (duplicata) e `packages/`. A documentação de context engineering continua descrevendo o monorepo inteiro.

### O que existe no disco e é código ativo

```
primeiro-passo-app/
├── src/                          # React + Vite SPA (onboarding)
├── supabase/functions/           # 31 Edge Functions (onboarding + OMIE + AI)
│   └── _shared/                  # 34 arquivos, mas 20 são dead code do checkout
├── ai-step2/                     # PRD e backlog do pipeline AI
├── .context/modules/omie/        # Context engineering OMIE (4 arquivos)
├── .cursor/{rules,skills,commands}
├── plan/                         # 5 planos
├── tasks/                        # 7 tarefas + template
├── scripts/                      # Utilitários
├── package.json                  # name: "primeiro-passo-app"
└── .env.example
```

### O que está no git mas NÃO existe no disco (deletado mas tracked)

| Diretório | Arquivos | Status |
|-----------|----------|--------|
| `apps/dashboard/` | ~130 arquivos (React, hooks, testes) | Deletado do disco, tracked no git |
| `apps/omie/` | ~30 arquivos (Express, transformers, testes) | Deletado do disco, tracked no git |
| `apps/checkout-cielo/` | ~4 arquivos (config, HTML) | Deletado do disco, tracked no git |
| `apps/onboarding/` | ~60 arquivos (duplicata do `src/` raiz) | Deletado do disco, tracked no git |
| `packages/shared/` | package.json | Deletado do disco, tracked no git |
| `packages/tsconfig/` | 4 configs JSON | Deletado do disco, tracked no git |
| `packages/eslint-config/` | 2 arquivos | Deletado do disco, tracked no git |
| `pnpm-workspace.yaml` | 1 | Deletado do disco, tracked no git |
| `turbo.json` | 1 | Deletado do disco, tracked no git |

### Dead code em `_shared/` (20 arquivos checkout que nada importa)

```
checkout-contracts.ts     ← import quebrado apontando para packages/shared/
checkout-status.ts        checkout-url.ts          checkout-session-errors.ts
boleto-parcelado.ts       card-brand.ts            decline-mapping.ts
idempotency.ts            lead-stage.ts            payment-visibility.ts
pix-discount.ts           rate-limit.ts            security-logger.ts
split.ts                  turnstile.ts             validation.ts
+ 4 arquivos .test.ts correspondentes
```

Nenhuma das 31 Edge Functions locais importa esses arquivos.

---

## Fase 0 — Limpar o git (15min)

O git mostra 284 arquivos como "deleted". Precisamos fazer o git parar de rastreá-los.

```bash
# Remove do tracking do git (não deleta nada do disco — já não existem)
git rm -r --cached apps/ packages/ pnpm-workspace.yaml turbo.json

git commit -m "chore: remove artefatos do monorepo do tracking git

Apps (dashboard, omie, checkout-cielo, onboarding duplicata) e
packages (shared, tsconfig, eslint-config) não pertencem mais a
este repositório standalone.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

> **Nota:** Se `apps/` e `packages/` tiverem entradas no `.gitignore`, adicionar lá também para evitar que voltem acidentalmente.

---

## Fase 1 — Remover dead code de `_shared/` (10min)

Deletar os 20 arquivos de `_shared/` que nenhuma Edge Function local importa:

```bash
# Dead code do checkout (import quebrado + módulos órfãos)
rm supabase/functions/_shared/checkout-contracts.ts
rm supabase/functions/_shared/checkout-status.ts
rm supabase/functions/_shared/checkout-url.ts
rm supabase/functions/_shared/checkout-url.test.ts
rm supabase/functions/_shared/checkout-session-errors.ts
rm supabase/functions/_shared/checkout-session-errors.test.ts
rm supabase/functions/_shared/boleto-parcelado.ts
rm supabase/functions/_shared/boleto-parcelado.test.ts
rm supabase/functions/_shared/card-brand.ts
rm supabase/functions/_shared/decline-mapping.ts
rm supabase/functions/_shared/idempotency.ts
rm supabase/functions/_shared/lead-stage.ts
rm supabase/functions/_shared/payment-visibility.ts
rm supabase/functions/_shared/pix-discount.ts
rm supabase/functions/_shared/rate-limit.ts
rm supabase/functions/_shared/security-logger.ts
rm supabase/functions/_shared/split.ts
rm supabase/functions/_shared/split.test.ts
rm supabase/functions/_shared/turnstile.ts
rm supabase/functions/_shared/validation.ts
```

```bash
git add -A supabase/functions/_shared/
git commit -m "chore: remove 20 _shared files órfãos do checkout

Nenhuma das 31 Edge Functions locais importa esses módulos.
checkout-contracts.ts tinha import quebrado para packages/shared/.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Fase 2 — Reescrever CLAUDE.md (1h)

O CLAUDE.md atual (315 linhas) descreve o monorepo. Reescrever para o repo standalone.

### O que remover

| Seção | Motivo |
|-------|--------|
| "Monorepo Structure" (árvore + tabela de 3 apps) | Não é monorepo |
| "Root (all apps)" commands (`pnpm dev/build/test/typecheck/lint`) | Não existe Turborepo |
| "Specific App" commands (`pnpm --filter @aurea/omie`, `@aurea/shared`) | Packages não existem |
| "Testing" com `@aurea/omie test`, `@aurea/checkout-cielo test`, Deno tests de `process-checkout` | Apps não existem |
| "Checkout Critical Rules" (6 regras: PCI-DSS, split rollback, cielo-webhook, etc.) | Nenhuma função de checkout existe |
| "Edge Functions (_shared modules)" tabela de 18 módulos | 20 já removidos na Fase 1 |
| "Shared Package (@aurea/shared)" seção inteira | Package não existe |
| "Resend Email Provider" | `send-checkout-link-email` não existe |
| "Pre-PR Checklist" (`pnpm build && pnpm typecheck && pnpm lint && pnpm test`) | Comandos errados |
| "Edge Functions Registry" — listas de Payment/Checkout (22), Recurrence (13), ClickSign (5) | Funções não existem neste repo |
| "External API Integration" — linhas de Cielo/Braspag, ClickSign, Resend | Integrações não locais |
| Referências a `apps/omie/AGENTS.md`, `apps/checkout-cielo/AGENTS.md` | Não existem |
| Referências a `docs/edge-functions-publicas-e-protegidas.md`, `docs/resend-email-provider.md` | `docs/` não existe |

### O que manter e adaptar

| Seção | Adaptação |
|-------|-----------|
| Estrutura do repo | Nova árvore refletindo `src/`, `supabase/functions/`, `ai-step2/` |
| Comandos | `npm run dev`, `npm run build`, `npm run lint`, `npm run preview` |
| Supabase commands | Manter (functions serve, deploy com --project-ref) |
| Supabase Critical Rules | Manter (RLS, migrations, auth pattern) |
| Code Style | Manter mas remover referências a `module: NodeNext` do omie |
| SDD Convention | Manter |
| OMIE Integration Context | Manter |
| Plan Convention | Manter |
| Vercel Deploy | Atualizar Root Directory para `.` (não `apps/onboarding`) |
| Edge Functions Registry | Manter APENAS as 31 funções locais, organizadas por domínio |

### O que adicionar

- Seção "Onboarding App" descrevendo o app React (etapas, context, componentes)
- Seção "AI Campaign Pipeline" descrevendo ai-step2 e Edge Functions de geração
- Comandos Deno test para funções locais

---

## Fase 3 — Atualizar CONTEXT-MAP.md (20min)

### Remover domínios sem docs locais

| Domínio | Referência quebrada | Ação |
|---------|-------------------|------|
| Checkout | `.context/modules/checkout/README.md` | Remover |
| Dashboard | `.context/modules/dashboard/README.md`, `apps/dashboard/src/` | Remover |
| ClickSign | `.context/modules/clicksign/README.md` | Remover |
| Email | `.context/modules/email/README.md`, `docs/resend-email-provider.md` | Remover |
| NFS-e | `.context/modules/nfe/README.md` | Remover |
| Edge Functions (deploy) | `docs/edge-functions-publicas-e-protegidas.md` | Remover |

### Manter

- **OMIE** — `.context/modules/omie/` está completo
- **Tarefas Operacionais** — `tasks/` está funcional

### Adicionar

- **Onboarding** — `src/`, componentes, context, pages
- **AI Campaign** — `ai-step2/PRD.md`, `ai-step2/BACKLOG.md`, Edge Functions

---

## Fase 4 — Atualizar .cursor/ (20min)

### 4.1 `rules/omie-docs-and-skills.mdc`

Remover glob `"apps/omie/**"` (diretório não existe). Manter os demais globs de `supabase/functions/omie-*/**`.

### 4.2 `skills/nova-tarefa/SKILL.md`

- Remover referência a `docs/edge-functions-publicas-e-protegidas.md` (5 ocorrências)
- Atualizar mapeamento de palavras-chave→módulo: remover domínios que não existem localmente (checkout, clicksign, email, deploy)

### 4.3 `skills/task-enricher/SKILL.md`

- Mesmas remoções de `docs/` (4 ocorrências)
- Atualizar tabela de módulos: remover checkout, dashboard, clicksign, email
- Remover referência a `apps/{app}/AGENTS.md`

### 4.4 `skills/omie-integracao/SKILL.md`

- Verificar se referencia `apps/omie/` — se sim, remover

### 4.5 `commands/convert-to-plan.md`

- Remover referência a `@docs/edge-functions-publicas-e-protegidas.md`

---

## Fase 5 — Atualizar .context/modules/omie/ (20min)

### 5.1 `README.md`

Remover/atualizar:
- `apps/omie/src/` (linha 45) → referência ao backend Express que não existe aqui
- `apps/omie/tests/` (linhas 161-162) → testes não locais
- `apps/dashboard/src/pages/` (linhas 46-48, 51) → dashboard não existe aqui
- `pnpm --filter @aurea/omie test` (linha 162) → comando inválido

Opção: adicionar nota de que esses componentes existem no monorepo principal e não neste repo.

### 5.2 `checklist-geral.md`

Remover referências a `apps/dashboard/src/` (3 ocorrências). Marcar como "referência ao monorepo" se houver valor histórico.

---

## Fase 6 — Decisão sobre plan/ e tasks/ (15min)

### Planos

| Plano | Refs | Decisão sugerida |
|-------|------|-----------------|
| `2026-04-02-extracao-onboarding.md` | 3 | Mover para `plan/historico/` — já executado |
| `2026-04-02-recomendacoes-arquitetura-monorepo.md` | 11 | Mover para `plan/historico/` — sobre o monorepo |
| `2026-04-02-melhoria-contexto-omie.md` | 7 | Manter (✓ concluído) — adicionar disclaimer |
| `2026-04-02-guia-git-rebase-reflog-recuperacao.md` | 3 | Manter — guia genérico, refs são exemplos |
| `README.md` | 1 | Atualizar: remover planos do monorepo do índice |

### Tasks

| Task | Refs | Decisão sugerida |
|------|------|-----------------|
| TASK-002 (tipo-venda-caracteristicas-os) | 15 | **Mover para `tasks/arquivo/`** — referencia apps/omie e apps/dashboard |
| TASK-003 (boleto-parcelado-dashboard) | 12 | **Mover para `tasks/arquivo/`** — 100% sobre apps/dashboard |
| TASK-004 (badge-checkout-version) | 8 | **Mover para `tasks/arquivo/`** — 100% sobre apps/dashboard |
| TASK-006 (calibracao-polling-omie) | 0 | Manter — sobre Edge Functions que existem aqui |
| TASK-007 (validacao-sync-vendedores) | 0 | Manter — sobre Edge Functions que existem aqui |
| TASK-008 (validacao-retry-worker) | 0 | Manter — sobre Edge Functions que existem aqui |
| TASK-009 (data-competencia-os) | 0 | Manter — sobre Edge Functions que existem aqui |

---

## Fase 7 — Verificação final (10min)

```bash
# Nenhuma referência a apps/ ou packages/ fora de plan/historico/ e tasks/arquivo/
grep -rn "apps/omie\|apps/dashboard\|apps/checkout\|@aurea/shared\|@aurea/omie\|@aurea/checkout\|packages/shared\|packages/tsconfig\|packages/eslint" \
  --include="*.md" --include="*.mdc" --include="*.ts" \
  . | grep -v node_modules | grep -v plan/historico | grep -v tasks/arquivo | grep -v relatorio

# Import quebrado resolvido
test ! -f supabase/functions/_shared/checkout-contracts.ts && echo "OK: dead import removido"

# Build passa
npm run build

# Git limpo
git status
```

---

## Resumo de Execução

| Fase | O que | Tempo | Prioridade |
|------|-------|-------|------------|
| 0 | `git rm` dos 284 arquivos tracked do monorepo | 15min | P0 |
| 1 | Deletar 20 _shared files dead code | 10min | P0 |
| 2 | Reescrever CLAUDE.md para repo standalone | 1h | P0 |
| 3 | Atualizar CONTEXT-MAP.md | 20min | P1 |
| 4 | Atualizar .cursor/ (rules, skills, commands) | 20min | P1 |
| 5 | Atualizar .context/modules/omie/ | 20min | P2 |
| 6 | Mover plans e tasks órfãos para historico/arquivo | 15min | P2 |
| 7 | Grep de verificação + build | 10min | P0 |
| **Total** | | **~3h** | |

---

## Decisão necessária do Anderson

Antes de executar:

1. **Tasks TASK-002, TASK-003, TASK-004** — essas tarefas são sobre features do dashboard e do omie backend que não existem neste repo. Arquivar em `tasks/arquivo/` ou deletar?

2. **Plano de extração (`2026-04-02-extracao-onboarding.md`)** — já foi executado. Mover para `plan/historico/` ou deletar?

3. **Plano de recomendações do monorepo (`2026-04-02-recomendacoes-arquitetura-monorepo.md`)** — é sobre o monorepo. Mover para histórico ou deletar?
