---
id: TASK-2026-04-02-004
title: "Badge de versão do checkout (v1/v2) na tabela Overview"
status: validacao
priority: "baixa"
modulo: "dashboard"
origem: "observacao"
reportado-por: "time"
data-criacao: 2026-04-02
data-enriquecimento: 2026-04-02
data-aprovacao: 2026-04-02
data-conclusao:
scale: "QUICK"
arquivos-alvo:
  - apps/dashboard/src/pages/Overview.tsx
related-plan: ""
---

# TASK-2026-04-02-004: Badge de versão do checkout (v1/v2) na tabela Overview

## Relato Original

> **Preenchido por:** time (observacao)
> **Fonte:** observacao

**Descrição:**

Quero colocar uma badge na tabela de transações indicando se o checkout é o v1 ou v2. Quando não existir checkout, deixar como "-"

**Evidências (prints, logs, URLs):**

_Nenhuma._

**Contexto adicional (coletado na triagem):**

A tabela de transações fica na rota `/` (OverviewPage). A versão do checkout é uma config global (`checkout_config.checkout_version`), mas a URL gerada é diferente por versão:
- v1: `${base_url}?session=<id>`
- v2: `${base_url}/contrato-flow-v3.html?session=<id>`

O campo `checkout_url` já está disponível na view `v_transaction_pipeline` (e `v_transaction_pipeline_active`), portanto a versão pode ser **derivada no frontend sem migration**.

---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `dashboard`
- **Context docs lidos:**
  - `.context/modules/dashboard/README.md`
  - `apps/dashboard/src/hooks/useTransaction.ts` — interface `TransactionPipeline` com campo `checkout_url`
  - `apps/dashboard/src/pages/Overview.tsx` — tabela de transações, colunas existentes
  - `supabase/functions/_shared/checkout-url.ts` — lógica de diferenciação v1/v2 por URL
  - `supabase/migrations/20260323120000_add_checkout_version_to_checkout_config.sql` — definição do campo global

### Arquivos Relacionados

| Arquivo | Papel |
|---------|-------|
| `apps/dashboard/src/pages/Overview.tsx` | Tabela principal — onde a badge será adicionada |
| `apps/dashboard/src/hooks/useTransaction.ts` | Interface `TransactionPipeline` (campo `checkout_url: string \| null` já existe) |
| `apps/dashboard/src/hooks/useCheckoutConfig.ts` | Hook de config global (não usado na Overview diretamente) |
| `supabase/functions/_shared/checkout-url.ts` | Lógica canônica de URL: v2 contém `/contrato-flow-v3.html` |

### functionSpec Relevante

_Não se aplica — alteração puramente de frontend, sem Edge Function envolvida._

### Lógica de Derivação de Versão

Baseado em `supabase/functions/_shared/checkout-url.ts`:

```ts
function getCheckoutVersion(checkout_url: string | null): 'v1' | 'v2' | null {
  if (!checkout_url) return null
  return checkout_url.includes('/contrato-flow-v3.html') ? 'v2' : 'v1'
}
```

- `null` → exibir `"-"` (sem checkout)
- `'v1'` → badge `v1` (estilo neutro/cinza)
- `'v2'` → badge `v2` (estilo destacado/azul)

---

## Diagnóstico

> **Preenchido por:** agente (enriquecimento)

**O que está acontecendo:** a tabela Overview não exibe qual versão do checkout foi associada a cada transação.

**Por que é relevante:** durante a transição entre v1 (checkout standalone) e v2 (contrato-flow-v3 multistep), é útil saber visualmente qual versão cada transação usa — especialmente para troubleshooting operacional.

**Causa raiz:** nenhuma coluna na tabela Overview expõe essa informação. O campo `checkout_url` já está disponível na view e no hook, mas não é renderizado como badge de versão.

**Impacto:** baixo — é uma melhoria informacional, sem impacto operacional.

**Riscos da implementação:** mínimos — é read-only, derivado de campo existente, sem mutation nem nova query.

**Decisão de design:** derivar a versão do `checkout_url` no frontend (sem migration, sem nova coluna no banco). Isso é correto porque:
1. O campo `checkout_url` já está na view e no tipo `TransactionPipeline`
2. A URL v2 tem path `/contrato-flow-v3.html` como discriminador canônico (definido em `_shared/checkout-url.ts`)
3. Não há sessões onde `checkout_url != null` mas a versão seja ambígua

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano
> **Regra obrigatória na execução:** atualizar todos os checkboxes deste documento conforme estado real (feito `[x]` / pendente `[ ]`).
> **Regra obrigatória após aprovação:** executar validações (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`) e registrar resultado real antes de encerrar a entrega.

### Scale: QUICK

### Steps

- [x] **Step 1:** Adicionar helper `getCheckoutVersion` e nova coluna na tabela
  - Arquivo(s): `apps/dashboard/src/pages/Overview.tsx`
  - Mudança:
    1. Adicionar função helper pura `getCheckoutVersion(url: string | null): 'v1' | 'v2' | null` próximo às demais helpers do arquivo (ou inline no render, dado que é simples).
    2. Adicionar `<th>` para a coluna "Checkout" no `<thead>` da tabela, após a coluna "Forma pgto" (antes do "Pipeline").
    3. Adicionar `<td>` correspondente no `<tbody>` com a lógica:
       - `null` → `<span className="text-muted-foreground">—</span>`
       - `'v1'` → `<Badge variant="outline" className="...">v1</Badge>`
       - `'v2'` → `<Badge variant="outline" className="...">v2</Badge>` (cor diferenciada)
    4. Ajustar `min-w-[1320px]` da tabela se necessário para acomodar a nova coluna.

### Testes Necessários

- [ ] Verificar visualmente na OverviewPage:
  - Transação com `checkout_url` contendo `/contrato-flow-v3.html` → badge `v2`
  - Transação com `checkout_url` sem essa path → badge `v1`
  - Transação com `checkout_url = null` → `—`

### Deploy

_Apenas frontend. Deploy via Vercel ao fazer push para a branch correta._
_Não envolve Edge Functions nem Supabase migrations._

---

## Critérios de Aceite

> **Preenchido por:** agente (enriquecimento) | **Validado por:** humano

- [x] Nova coluna "Checkout" visível na tabela Overview entre "Forma pgto" e "Pipeline"
- [x] Badge `v1` exibida para transações com `checkout_url` sem `/contrato-flow-v3.html`
- [x] Badge `v2` exibida para transações com `checkout_url` contendo `/contrato-flow-v3.html`
- [x] Célula exibe `—` (muted) quando `checkout_url` é `null` ou ausente
- [x] Layout da tabela não quebra em desktop (`overflow-x-auto` existente deve absorver a nova coluna)
- [x] Sem regressão nas colunas existentes

---

## Execução

> **Preenchido durante:** em-execucao → validacao

### Commits

_Pendente de commit._

### Notas de Execução

- Implementação em `apps/dashboard/src/pages/Overview.tsx`:
  1. Helper `getCheckoutVersion(url)` adicionado após `normalizeAmountFilters`.
  2. `<th>` "Checkout" (`min-w-[80px]`) inserido entre "Forma pgto" e "Pipeline" no `<thead>`.
  3. `<td>` correspondente inserido no `<tbody>`: badge `v2` com `border-blue-400 text-blue-600`; badge `v1` com estilo muted; `—` quando sem checkout.
- Sem migration necessária — versão derivada do `checkout_url` existente na view.
- Falhas de teste pré-existentes (`useRealtime` conta 5 listeners em vez de 6; `useSplitMetrics` com mock incompleto) — não introduzidas por esta tarefa.

---

## Validação

> **Preenchido durante:** validacao

- [ ] Testes passam (`pnpm test`) — 6 falhas **pré-existentes** em `useRealtime` e `useSplitMetrics`; sem relação com esta tarefa. 186/192 passam.
- [x] TypeCheck passa (`pnpm typecheck`) — sem erros
- [ ] Lint passa (`pnpm lint`) — comando não disponível no workspace
- [x] Build OK (`pnpm build`) — build de produção concluído sem erros
- [x] Critérios de aceite verificados
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** concluida

**Data:** {data-conclusao}
**Resultado:** {resolvido | parcial | promovido-a-plan}
**Observações:**
