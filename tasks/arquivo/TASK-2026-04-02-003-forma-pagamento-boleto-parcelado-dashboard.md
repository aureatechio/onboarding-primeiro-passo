---
id: TASK-2026-04-02-003
title: "Forma de pagamento exibe 'Boleto' em vez de 'Boleto 12x' no detalhe da transação"
status: validacao
priority: media
modulo: dashboard
origem: observacao
reportado-por: usuario
data-criacao: 2026-04-02
data-enriquecimento: 2026-04-02
scale: SMALL
arquivos-alvo:
  - apps/dashboard/src/components/StepDetail.tsx
  - apps/dashboard/src/lib/payment-financial-summary.ts
related-plan: ""
---

# TASK-2026-04-02-003: Forma de pagamento exibe 'Boleto' em vez de 'Boleto 12x' no detalhe da transação

## Relato Original

> **Preenchido por:** usuário (observação)
> **Fonte:** observacao

**Descrição:**

> compra_id: 2cecb4b2-b043-4e17-b5db-263c59647061
> Conferir forma de pagamento pois está diferente, cliente fez em 12x no boleto e está como pagamento a vista no dashboard do monitor.

**Evidências (prints, logs, URLs):**

- Screenshot do dashboard: painel "Detalhes do Pagamento" da transação `2cecb4b2-b043-4e17-b5db-263c59647061` não exibe o método de pagamento nem quantidade de parcelas.
- O campo "Payment ID (Braspag/Cielo)" e "NSU" aparecem como `—` (session é `split_created`, não standalone).
- O "Checkout Status" mostra `pago`, "Quitação da venda" mostra `Quitação total`.
- Compra com R$ 180.000,00 — boleto parcelado 12x = sessão pai com `status: split_created` + 12 child sessions.

**Contexto adicional (coletado na triagem):**

- A compra está concluída (etapa "Concluído", status `completed`).
- O pipeline exibe todos os 5 steps como concluídos (Checkout, Contrato, Pagamento, OMIE, NFS-e).
- Operador quer confirmar a forma de pagamento e parcelas no painel "Detalhes do Pagamento".

---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `dashboard`
- **Context docs lidos:**
  - `.context/modules/dashboard/checkout-monitor/README.md`
  - `.context/modules/checkout/README.md`
  - `apps/dashboard/src/components/StepDetail.tsx`
  - `apps/dashboard/src/hooks/useTransaction.ts`
  - `supabase/migrations/20260327173000_prioritize_active_split_in_v_transaction_pipeline.sql`

### Arquivos Relacionados

- `apps/dashboard/src/components/StepDetail.tsx` — componente `PaymentDetail` (linhas ~993-1197): painel "Detalhes do Pagamento"
- `apps/dashboard/src/components/StepDetail.tsx` — função `formatMethodLabel()` (linha ~708): converte `metodo_pagamento` para label legível
- `apps/dashboard/src/components/StepDetail.tsx` — componente `CheckoutDetail` (linha ~404): exibe "Método" e "Parcelas" apenas no painel Checkout
- `apps/dashboard/src/hooks/useTransaction.ts` — interface `TransactionPipeline`: campos `metodo_pagamento`, `split_type`, `split_total_sessoes`, `compra_numero_parcelas`, `parcelas`
- `supabase/migrations/20260327173000_prioritize_active_split_in_v_transaction_pipeline.sql` — `v_transaction_pipeline`: seleciona sessão representativa; para boleto parcelado, a sessão pai tem `metodo_pagamento = 'boleto'` e `status = 'split_created'`
- `apps/dashboard/src/lib/checkout-monitor.ts` — tipos e helpers de formatação do monitor

### functionSpec Relevante

Não há `functionSpec.md` para esta parte de UI — é componente frontend puro, sem Edge Function envolvida.

---

## Diagnóstico

> **Preenchido por:** agente (enriquecimento)

### Causa Raiz

O painel **"Detalhes do Pagamento"** (`PaymentDetail` em `StepDetail.tsx`) **não exibe** o campo "Forma de Pagamento" (método + parcelas). Esses campos (`metodo_pagamento`, parcelas) só são exibidos no painel **"Detalhes do Checkout"** (`CheckoutDetail`).

Para transações com boleto parcelado, a sessão representativa na view `v_transaction_pipeline` tem:
- `metodo_pagamento = 'boleto'`
- `status = 'split_created'` (sessão pai)
- `split_type = 'boleto_parcelado'`
- `split_total_sessoes = 12`

A função `resolveCheckoutInstallments()` (linha 380) já calcula corretamente as parcelas no contexto do **painel Checkout**, mas esse dado não aparece no **painel Pagamento**.

### Por que está acontecendo

O `PaymentDetail` foi desenhado para mostrar dados financeiros (valores, status de quitação, timeline de sessões), sem incluir o campo de método de pagamento. Para boleto parcelado, o operador precisa clicar no step "Checkout" para ver o método — não é intuitivo.

### Impacto

- Operadores que analisam o painel de Pagamento não conseguem confirmar rapidamente se a venda foi boleto parcelado, quantas parcelas, ou se era boleto à vista.
- Visualmente, a ausência do campo cria ambiguidade: o painel não deixa claro se é boleto parcelado em 12x, boleto à vista, cartão, PIX, etc.

### Riscos da Correção

- Baixo: é apenas adição de campos de display no `PaymentDetail`. Sem alteração de lógica de negócio, sem Edge Functions, sem migrations.
- A lógica de cálculo de parcelas já existe em `resolveCheckoutInstallments()` — pode ser reutilizada ou extraída.

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano

### Scale: SMALL

### Steps

- [ ] **Step 1:** Adicionar campo "Forma de Pagamento" no início do `PaymentDetail`
  - Arquivo(s): `apps/dashboard/src/components/StepDetail.tsx`
  - Mudança: Adicionar `<DetailRow label="Forma de Pagamento" value={formatPaymentMethodWithInstallments(data)} />` logo após o campo "Payment ID", antes de "NSU".
  - Implementar helper `formatPaymentMethodWithInstallments(data: TransactionPipeline): string`:
    - Se `split_type === 'boleto_parcelado'` → `"Boleto ${split_total_sessoes}x (parcelado)"`
    - Se `split_type === 'dual_payment'` → `"${formatMethodLabel(metodo_pagamento)} + Split (2 meios)"`
    - Se `checkout_recorrencia_enabled` → `"Cartão Recorrente ${recorrencia_total_parcelas}x"`
    - Se `parcelas > 1` → `"${formatMethodLabel(metodo_pagamento)} ${parcelas}x"`
    - Caso contrário → `formatMethodLabel(metodo_pagamento)` (ex: "Boleto", "PIX", "Cartão")

- [ ] **Step 2:** Validar que o campo exibe corretamente para os 4 cenários principais
  - Boleto parcelado 12x → "Boleto 12x (parcelado)"
  - Boleto à vista → "Boleto"
  - PIX → "PIX"
  - Cartão 3x → "Cartão 3x"
  - Cartão recorrente 12x → "Cartão Recorrente 12x"
  - Split 2 meios (PIX + Boleto) → "Boleto + Split (2 meios)"

### Testes Necessários

- [ ] Verificação manual com `compra_id: 2cecb4b2-b043-4e17-b5db-263c59647061` (boleto parcelado 12x)
- [ ] Verificar visualmente com outra compra de boleto à vista
- [ ] Verificar com compra de PIX
- [ ] `pnpm typecheck` no workspace do dashboard

### Deploy

Apenas frontend (Vercel). Não envolve Edge Functions.

```bash
# Build local para verificar
pnpm --filter @aurea/dashboard build
pnpm --filter @aurea/dashboard typecheck
```

Deploy via Vercel (push para branch / PR).

---

## Critérios de Aceite

> **Preenchido por:** agente (enriquecimento) | **Validado por:** humano

- [ ] O painel "Detalhes do Pagamento" exibe campo "Forma de Pagamento" com valor legível
- [ ] Para `compra_id: 2cecb4b2-b043-4e17-b5db-263c59647061`, o campo exibe algo como "Boleto 12x (parcelado)"
- [ ] Para boleto à vista, exibe "Boleto" (sem "x")
- [ ] Para PIX, exibe "PIX"
- [ ] Para cartão com parcelas, exibe "Cartão Nx"
- [ ] Para cartão recorrente, exibe "Cartão Recorrente Nx"
- [ ] Não quebra nenhum cenário sem `metodo_pagamento` (exibe "—")
- [ ] `pnpm typecheck` passa sem erros

---

## Execução

> **Preenchido durante:** em-execucao → validacao

### Commits

<!-- a confirmar após push -->

### Notas de Execução

- Implementado helper `formatPaymentMethodWithInstallments()` em `StepDetail.tsx`, logo acima de `formatMethodLabel()`, reutilizando as funções `isBoletoParceladoSplit` e `isDualPaymentSplit` já importadas.
- Campo "Forma de Pagamento" adicionado como primeira linha do `PaymentDetail`, antes de "Payment ID (Braspag/Cielo)".
- `pnpm typecheck` passou sem erros.

---

## Validação

> **Preenchido durante:** validacao

- [ ] Testes passam (`pnpm test`)
- [ ] TypeCheck passa (`pnpm typecheck`)
- [ ] Lint passa (`pnpm lint`)
- [ ] Build OK (`pnpm build`)
- [ ] Critérios de aceite verificados
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** concluida

**Data:** {data-conclusao}
**Resultado:** {resolvido | parcial | promovido-a-plan}
**Observações:**
