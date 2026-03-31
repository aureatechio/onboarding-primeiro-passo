# Ajuste de Elegibilidade do Monitor ai-step2

## Contexto

O dropdown de `Compra elegivel` no monitor (`/ai-step2/monitor?mode=list`) estava incluindo compras com contrato assinado, mas sem pagamento confirmado em `checkout_status`.

## O que mudou

1. `get-ai-campaign-monitor` passou a listar compras elegiveis apenas quando:
   - `checkout_status = 'pago'`
   - `clicksign_status = 'Assinado'`
   - sem job existente em `ai_campaign_jobs`
2. `checkAiCampaignEligibility` foi alinhado com a mesma regra de pagamento (`checkout_status = 'pago'`).
3. Placeholder do select no monitor foi atualizado para:
   - `Compra elegivel (paga + contrato assinado)`

## Por que mudou

Alinhar comportamento do painel e do gate de criacao de job com a regra operacional definida: somente compras pagas e assinadas devem ser consideradas elegiveis.

## Evidencias

- Baseline anterior (query): havia compras `aguardando_pagamento` e `parcialmente_pago` na lista elegivel quando `vendaaprovada = true`.
- Caso de controle excluido:
  - `42a4e250-1dfb-404e-b0c3-67fb1e7e0761` nao retorna na query estrita (`checkout_status='pago'`).
- Caso de controle mantido:
  - `a15d556a-8b5b-4802-a3dd-debd619b6b79` retorna na query estrita.
- Lint onboarding executado sem erros (apenas warnings preexistentes no modulo).

## Arquivos alterados

- `supabase/functions/get-ai-campaign-monitor/index.ts`
- `supabase/functions/_shared/ai-campaign/eligibility.ts`
- `apps/onboarding/src/pages/AiStep2Monitor/ListModePanel.jsx`
- `apps/onboarding/ai-step2/CONTRACT.md`
- `.context/modules/onboarding/README.md`
