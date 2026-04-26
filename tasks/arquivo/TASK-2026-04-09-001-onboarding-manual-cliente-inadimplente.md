---
id: TASK-2026-04-09-001
title: "Gerar onboarding manualmente para cliente com pagamento pendente"
status: triagem
priority: alta
modulo: onboarding
origem: observacao
reportado-por: Anderson
data-criacao: 2026-04-09
data-enriquecimento:
data-aprovacao:
data-conclusao:
scale: ""
arquivos-alvo: []
related-plan: ""
---

# TASK-2026-04-09-001: Gerar onboarding manualmente para cliente com pagamento pendente

## Relato Original

> **Preenchido por:** Anderson (triagem)
> **Fonte:** observacao (diagnóstico via MCP Supabase)

**Descrição:**

Cliente com compra `8111ca29-9646-4832-8582-f4686dcb65c5` precisa ter o onboarding gerado, mas o pagamento não foi efetuado. O formulário Primeiro Passo está acessível (elegibilidade OK via `vendaaprovada = true`), porém o pipeline de enrichment e geração de campanha IA não dispara porque exige `checkout_status = 'pago'`.

**Evidências:**

| Dado | Valor |
|---|---|
| **compra_id** | `8111ca29-9646-4832-8582-f4686dcb65c5` |
| **cliente_id** | `e093f797-7cc4-4f7d-9843-3cfbd1f077cb` |
| **checkout_status** | `aguardando_pagamento` |
| **clicksign_status** | `Assinado` |
| **vendaaprovada** | `true` |
| **forma_pagamento** | Boleto |
| **pagamento_futuro** | `true` |
| **data_pagamento_futuro** | 2026-04-02 |
| **1o boleto vencimento** | 2026-04-03 (vencido) |
| **valor_total** | R$ 9.068,51 |
| **parcelas (checkout_sessions)** | 3x boleto (R$ 1.511,46 / R$ 1.511,41 / R$ 1.511,41) — todas `pending` |
| **onboarding_identity** | AUSENTE (cliente não preencheu) |
| **onboarding_briefings** | AUSENTE (cliente não preencheu) |
| **ai_campaign_jobs** | NENHUM |

**Contexto adicional:**

- O formulário Primeiro Passo carrega normalmente (regra de elegibilidade: `(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'` — satisfeita).
- O cliente nunca acessou/preencheu o formulário.
- Mesmo que o cliente preencha agora, o pipeline `onboarding-enrichment` exige `checkout_status = 'pago'` para disparar automaticamente.
- Primeiro boleto venceu em 03/04/2026 — 6 dias atrás sem pagamento confirmado.

---

## Decisão Pendente

Para prosseguir, definir qual caminho seguir:

1. **Atualizar `checkout_status` para `pago` manualmente** — desbloqueia o enrichment automático, mas registra um pagamento que não ocorreu.
2. **Disparar o enrichment manualmente** — ignorando a checagem de `checkout_status`, mantendo o banco fiel à realidade financeira.
3. **Aguardar pagamento** — cobrar o cliente e só gerar o onboarding após confirmação do boleto.
4. **Flexibilizar a regra do enrichment** — permitir que `vendaaprovada = true` seja suficiente para disparar o pipeline (mudança de código).
