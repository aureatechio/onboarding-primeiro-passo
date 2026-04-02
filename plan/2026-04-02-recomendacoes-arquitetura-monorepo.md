# Recomendações de Arquitetura — Monorepo AUREA

**Data:** 2026-04-02
**Status:** Referência ativa
**Autor:** Anderson + Claude

---

## Resumo Executivo

O monorepo AUREA está saudável para o estágio atual do produto e tamanho do time. As apps são desacopladas (zero imports cruzados), o tooling centralizado (Turbo + pnpm + tsconfig/eslint) funciona bem, e cada app já tem deploy independente via Vercel/Supabase. Este documento registra as recomendações de médio e longo prazo identificadas na análise de viabilidade de abril/2026.

---

## Médio Prazo (1-3 meses)

### 1. Estruturar `supabase/functions/_shared/` como pacote interno

**Problema:** O diretório `_shared/` tem 7.157 linhas de TypeScript e é importado por 50+ das 90 Edge Functions (175 imports). Na prática, é uma biblioteca interna sem testes próprios, sem versionamento e sem API de superfície definida. Uma mudança no `cors.ts` afeta 37 funções silenciosamente.

**Recomendação:**

Tratar `_shared/` como um pacote com responsabilidade definida, mesmo que não seja publicado no npm.

Ações concretas:

- Criar um `README.md` em `_shared/` documentando cada módulo, sua responsabilidade e quais funções o consomem.
- Adicionar testes unitários para os módulos mais críticos: `cors.ts`, `auth.ts`, `activity-logger.ts`, `checkout-status.ts`, `rate-limit.ts`.
- Considerar um barrel export (`_shared/mod.ts`) para controlar a API pública e evitar imports profundos.
- Rodar os testes do `_shared/` como step obrigatório antes de deploy de qualquer Edge Function.

Isso não exige reestruturação — é adicionar disciplina ao que já existe.

### 2. Padronizar naming e convenções do onboarding (se mantido no monorepo)

**Problema:** O package name `primeiro-passo-app` não segue a convenção `@aurea/`. O app usa JS puro enquanto o resto do monorepo é TypeScript. O eslint config é standalone ao invés de estender `@aurea/eslint-config`.

**Recomendação:**

Se o onboarding for extraído para repo próprio (ver `plan/2026-04-02-extracao-onboarding.md`), isso se resolve naturalmente. Se for mantido, padronizar:

- Renomear para `@aurea/onboarding` no package.json
- Estender `@aurea/eslint-config` ao invés de config standalone
- Considerar migração gradual para TypeScript (pelo menos tsconfig + `.tsx`)

### 3. Habilitar Turborepo Remote Caching

**Problema:** À medida que o monorepo cresce, `pnpm build` e `pnpm typecheck` ficam mais lentos. Hoje o cache é local — cada dev e cada CI run começa do zero.

**Recomendação:**

Habilitar remote caching do Turborepo para compartilhar cache entre CI e devs.

```bash
# Vincular ao Vercel (grátis para teams)
npx turbo login
npx turbo link

# Ou self-hosted com ducktape/turborepo-remote-cache
```

Benefício esperado: builds incrementais 60-80% mais rápidos em CI. Custo: ~15 minutos de setup.

### 4. Criar contratos de API entre apps e Edge Functions

**Problema:** O Dashboard e o Onboarding chamam Edge Functions via HTTP, mas não existe um contrato tipado compartilhado (exceto `checkout-contracts` no shared). Se uma Edge Function muda o shape do response, o frontend só descobre em runtime.

**Recomendação:**

Expandir o padrão de `@aurea/shared/checkout-contracts` para outros domínios:

- `@aurea/shared/onboarding-contracts` — tipos de request/response para as 7 funções de onboarding
- `@aurea/shared/omie-contracts` — tipos para as funções OMIE
- `@aurea/shared/clicksign-contracts` — tipos para as funções ClickSign

Isso funciona mesmo se o onboarding for extraído — basta publicar o `@aurea/shared` como pacote npm privado ou usar o contrato como source of truth na documentação.

### 5. Documentar Edge Functions com functionSpec.md

**Problema:** Apenas algumas funções OMIE/NFe usam a convenção SDD (`functionSpec.md`). As 90 funções restantes não têm contrato formal documentado.

**Recomendação:**

Priorizar `functionSpec.md` para funções de alto risco (pagamento, webhook, recorrência). Não precisa cobrir todas as 90 — focar nas que, se quebrarem, causam impacto financeiro.

Funções prioritárias para documentação:

- `process-checkout` e `process-checkout-direct`
- `cielo-webhook`
- `process-recurrence`
- `create-split-from-session`
- `reconcile-pending-payments`

---

## Longo Prazo (3-12 meses)

### 6. Avaliar separação por domínio se o time crescer

**Cenário trigger:** Se o time passar de 3-4 devs trabalhando simultaneamente em domínios diferentes (checkout vs. OMIE vs. dashboard), o monorepo pode começar a gerar atrito — PRs conflitantes, CI lento, dependências implícitas.

**Modelo sugerido — "monorepo por domínio":**

```
aureatech/payments       → checkout-cielo + Edge Functions de pagamento + _shared/checkout
aureatech/crm            → dashboard + omie + Edge Functions OMIE/ClickSign + _shared/core
aureatech/onboarding     → onboarding (já extraído)
aureatech/infra           → supabase migrations + shared configs + CI/CD
```

**Quando NÃO fazer isso:** Se o time continuar pequeno (1-3 devs) e o Supabase for o único backend. Separar cria overhead de sincronização entre repos que não compensa com time pequeno.

**Quando considerar:** Se houver necessidade de ciclos de release independentes (ex: checkout precisa de hotfix sem esperar merge do dashboard), ou se o CI no monorepo ultrapassar 10 minutos mesmo com remote caching.

### 7. Migrar Edge Functions batch/fix para jobs programados

**Problema:** Existem 17+ Edge Functions OMIE, incluindo várias de batch/backfill (`omie-upsert-os-batch`, `omie-fix-contas-receber-batch`, `omie-fix-os-parcelas-batch`, `omie-backfill-client-address-batch`). Funções "fix" e "backfill" são operacionais e temporárias, mas ficam no codebase indefinidamente.

**Recomendação:**

- Mover operações batch para um sistema de jobs (Supabase pg_cron, ou um worker dedicado).
- Após executar e validar um backfill, remover a Edge Function do codebase. Manter no git history é suficiente.
- Adotar convenção de naming para funções temporárias: prefixo `temp-` ou `fix-`, com data de criação no nome.
- Revisar trimestralmente e remover funções que já cumpriram seu propósito.

Objetivo: reduzir as 90 funções para um número gerenciável (~50-60 funções de produção).

### 8. Estabelecer ownership por domínio

**Problema:** Com 4 apps, 90 Edge Functions e 3 packages, não está claro quem é responsável por cada parte. Isso funciona com time pequeno, mas escala mal.

**Recomendação:**

Criar um `CODEOWNERS` no GitHub que atribua reviewers por diretório:

```
# .github/CODEOWNERS
apps/dashboard/          @aureatech/frontend
apps/omie/               @aureatech/backend
supabase/functions/      @aureatech/backend
packages/shared/         @aureatech/backend @aureatech/frontend
supabase/migrations/     @aureatech/backend
```

Isso garante que mudanças em áreas críticas (migrations, shared, checkout functions) sempre passem por review do responsável, mesmo em time pequeno.

### 9. Monitorar métricas de saúde do monorepo

**Recomendação:** Acompanhar trimestralmente:

| Métrica | Valor atual | Sinal de alerta |
|---------|-------------|-----------------|
| Tempo de CI (build + test + typecheck) | Medir baseline | > 10 min |
| Número de Edge Functions | 90 | > 120 sem cleanup |
| Linhas em `_shared/` | 7.157 | > 10.000 sem testes |
| Apps no monorepo | 3 (pós-extração onboarding) | > 5 com times diferentes |
| Conflitos de merge/semana | Medir baseline | > 3/semana |

Se 2+ métricas entrarem em "sinal de alerta" simultaneamente, é hora de reavaliar a estrutura.

---

## Priorização

| # | Recomendação | Esforço | Impacto | Prioridade |
|---|-------------|---------|---------|------------|
| 1 | Estruturar `_shared/` com testes | Médio | Alto | P1 |
| 2 | Padronizar onboarding / extrair | Baixo | Médio | P1 |
| 3 | Turborepo Remote Caching | Baixo | Médio | P2 |
| 4 | Contratos de API tipados | Médio | Alto | P2 |
| 5 | functionSpec.md para funções críticas | Médio | Alto | P2 |
| 6 | Separação por domínio | Alto | Alto | P3 (condicional) |
| 7 | Migrar funções batch para jobs | Baixo | Médio | P3 |
| 8 | CODEOWNERS | Baixo | Médio | P3 |
| 9 | Métricas de saúde | Baixo | Baixo | P3 |

---

## Referências

- `plan/2026-04-02-extracao-onboarding.md` — Guia de extração do onboarding
- `docs/edge-functions-publicas-e-protegidas.md` — Classificação JWT das Edge Functions
- `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md` — Checklist de deploy batch
- `.context/modules/` — Documentação por módulo
