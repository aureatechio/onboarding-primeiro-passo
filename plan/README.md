# Planos

## Indice ativo

- `2026-04-08-onboarding-enrichment-master.md` **← PIPELINE NOVO**
  Plano orquestrador do pipeline de enriquecimento automatico pos-onboarding. Cliente envia logo/site/instagram, sistema extrai cores, detecta fonte, gera briefing via Perplexity e dispara campanha IA. 5 blocos sequenciais com dependencias explicitas, criterios de conclusao e rollback.

- `2026-04-08-enrichment-bloco1-schema.md`
  Bloco 1: Migrations (colunas site_url/instagram_handle em onboarding_identity, tabela onboarding_enrichment_jobs, tabela enrichment_config) e modulo _shared/enrichment/config.ts.

- `2026-04-08-enrichment-bloco2-shared.md`
  Bloco 2: Modulos shared color-extractor.ts, css-scraper.ts, font-detector.ts com testes unitarios.

- `2026-04-08-enrichment-bloco3-edge-functions.md`
  Bloco 3: Edge Functions onboarding-enrichment (orquestrador), get-enrichment-status, get/update-enrichment-config, alteracoes em save-onboarding-identity e create-ai-campaign-job.

- `2026-04-08-enrichment-bloco4-frontend.md`
  Bloco 4: Alteracoes em Etapa62, OnboardingContext, EtapaFinal, get-onboarding-data. Remocao de Etapa7.jsx e limpeza de copy/CopyEditor.

- `2026-04-08-enrichment-bloco5-integracao.md`
  Bloco 5: Integracao briefing→prompt-builder, 5 testes end-to-end, atualizacao de CLAUDE.md, CONTRACT.md, mapeamento e docs do modulo onboarding.

- `2026-04-07-alavancas-ab-sacred-face-aspect-ratio.md`
  Plano de implementação das Alavancas A+B para corrigir dois problemas de geração de imagens IA: distorção de proporção (aspectRatio nativo na generationConfig) e pose alterada da celebridade (reformulação do Sacred Face com safe zones e prompt mais imperativo). Bump de versão para v1.1.0.

- `2026-04-07-alavanca-d-composicao-hibrida-celebridade.md`
  Spec backlog para composição híbrida programática: Gemini gera apenas fundo+layout, celebridade é composta via Sharp WASM com regras determinísticas por grupo×formato. Elimina estruturalmente qualquer possibilidade de alteração da celebridade. Pré-requisito: validar se A+B são suficientes.

- `2026-04-07-compra-id-comando-onboarding.md`
  Plano de atualização do slash command `.cursor/commands/compra-id.md`: foco diagnóstico onboarding (identity, briefing, job IA), query SQL principal, limites de `activity_logs`, uso de `get_logs` para Edge Functions, checklist alinhado ao schema.

- `2026-04-06-melhoria-modulo-perplexity.md` ✓ **Concluido**
  Consolidacao arquitetural e SDD do modulo Perplexity: shared client extraido (client.ts), 6 functionSpec.md criados, 50 testes unitarios (normalize/prompt/discover/client), update-perplexity-config protegido com requireAdminPassword, CLAUDE.md e CONTRACT.md atualizados, CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md criado. Meta atingida: Perplexity alinhado ao padrao de qualidade do modulo OMIE.

- `2026-04-06-melhoria-modulo-nanobanana.md` ✓ **Concluido**
  Shared module extraido (_shared/nanobanana/config.ts), 3 functionSpecs (SDD) criados, seguranca via x-admin-password em update/read, admin-auth.ts compartilhado, 25 testes unitarios, CLAUDE.md e CONTRACT.md atualizados. Meta atingida: NanoBanana alinhado ao padrao de qualidade do modulo OMIE.

- `2026-04-06-limpeza-pos-extracao-monorepo.md` ✓ **Concluido**
  Limpeza pós-extração: git tracking, dead code _shared/, reescrita de CLAUDE.md, CONTEXT-MAP.md, .cursor/ e .context/modules/omie/ para repo standalone. Arquivamento de tasks e plans do monorepo.

- `2026-04-02-melhoria-contexto-omie.md` ✓ **Concluido**
  Plano executavel para melhorar a engenharia de contexto do modulo OMIE: DOC-READING-ORDER condicional, BUSINESS-RULES.md com regras criticas do codigo, reescrita da rule OMIE, registro completo no CLAUDE.md, 6 functionSpecs faltantes, atualizacao de specs e skill. Meta: eliminar falhas de primeira tentativa por contexto insuficiente.

- `2026-04-02-otimizacao-engenharia-contexto.md`
  Plano executado para reduzir ruido de contexto de IA: limpeza de regras/agents redundantes, globs contextuais, consolidacao de `CLAUDE.md` + `AGENTS.md`, criacao de `CONTEXT-MAP.md` e `apps/dashboard/AGENTS.md`.

- `CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`  
  Checklist operacional recorrente para deploy de Edge Functions com classificacao correta de JWT. Referencia: `docs/edge-functions-publicas-e-protegidas.md`.

- `2026-03-31-perplexity-test-page-autofill-backlog.md`  
  Backlog executavel para evoluir a pagina de testes Perplexity com auto-preenchimento de fontes (site/redes/fontes relevantes), botao de sugestao de briefing e plano de reuso no onboarding.

- `2026-03-31-aurea-garden-post-tools-backlog.md`  
  Backlog executavel para implementar a sessao "Aurea Garden" no monitor ai-step2 com duas ferramentas: Post Turbo (image-to-image) e Post Gen (prompt-to-image), incluindo contrato backend, observabilidade e rollout.

- `2026-03-13-smooth-contract-checkout-transition` (plano Cursor)  
  Transicao suave contrato → checkout via overlay de loading com prefetch + fade. Alteracoes em `contract-checkout.html/css/js`. Escolha sobre unificacao de HTMLs por custo/beneficio.

- `2026-03-16-recorrencia-mit-smart-retry.md`  
  Marcacao MIT (`Payment.Recurrent=true`) em cobrancas recorrentes + retry inteligente via decline-mapping.ts + correcao bug `tentativas=1` + classificacao JWT de 13 funcoes de recorrencia.

- `2026-03-16-checkout-cartao-recorrente.md`  
  Cartao Recorrente como opcao selecionavel na tela de checkout. CRM-driven (flag na compra) + gate global. Pos-processamento: SaveCard + create-recurrence apos aprovacao.

- `2026-03-16-contrato-nao-gerado-dual-payment.md`  
  Incidente: contrato ClickSign nao gerado em compra com dual payment (2x PIX). Analise de causa raiz com comparacao contra compra com contrato OK. Conclusao: disparo de contrato e independente do checkout e nao foi executado.

- `2026-03-16-envio-boleto-omie-split.md` (plano Cursor)  
  Correcao de `cEnvBoleto` em split/dual payment. Query complementar detecta boleto entre sessoes pagas com precedencia sobre `cEnvPix`. Afeta `omie-orchestrator`, `omie-upsert-os`, `omie-preview-upsert-os`.

- `2026-03-17-checkout-health-monitor.md`  
  Pagina de monitoramento de saude do checkout no dashboard. Consome views SQL de observabilidade existentes (SLA, divergencias, webhook signal) com Recharts e Realtime. Opcao A (client-side queries).

- `2026-03-17-boleto-primeiro-vencimento-opcional.md`  
  Parametro opcional `primeiro_vencimento` (YYYY-MM-DD) em `process-checkout` e `create-boleto-parcelado` para data customizada do primeiro boleto/parcela. Demais parcelas seguem +1 mes cada. Retrocompativel.

- `2026-03-17-cartao-recorrente-semantica-view.md` (plano Cursor)  
  Persistencia semantica de `metodo_pagamento='cartao_recorrente'` em checkout_sessions. View enriquecida com vigencia_meses, valor_parcela_recorrente_centavos, recorrencia_total_parcelas. Dashboard exibe "Cartao Recorrente" e valor/parcelas corretos.

- `2026-03-23-historico-pagamento-unificado-dashboard.md`  
  Timeline unificada no detalhe de pagamento do dashboard: entrada (PIX/cartao) + parcelas do carne com numeracao global. Hook `useCompraPaymentTimeline` + logica pura em `payment-timeline.ts`.

- `2026-03-23-alinhar-stepper-historico-pagamento.md`  
  Badge do step Pagamento no detalhe da transacao alinhado a timeline (`usePaymentStepSummary`, fetch compartilhado). Overview mantem fallback da view.

- `2026-03-23-checkout-modal-boleto-loading-ux.md`  
  Checkout SPA: loading da `processing-modal` (spinner branding + excecao `prefers-reduced-motion`), `ProcessingModal.show({ loadingContext })`, tokens CSS do boleto parcelado, modal boleto SVG, cards na lista do carnê com scroll.

- `2026-03-23-checkout-version-v2-dashboard-gate.md`  
  `checkout_config.checkout_version` (1.0 vs 2.0), dropdown no dashboard, link `create-checkout` para `contrato-flow-v3.html` em v2, ClickSign sem e-mail automático de assinatura em v2 (`communicate_events: none`). Evidências e comandos de deploy.

- `2026-03-23-checkout-v2-vercel-static-rewrite-fix.md`  
  Correcao do checkout 2.0 em producao na Vercel: remocao do rewrite global que devolvia `index.html` para assets `.js`/HTML v2; build `build-contrato-v3.cjs` + smoke e rollback.

- Notificações de evento para n8n (plano Cursor `notificacoes_evento_n8n`)  
  Webhook estruturado `OPERATIONAL_EVENTS_WEBHOOK_URL`, módulo `_shared/operational-events.ts`, instrumentação em create/get/process checkout, cielo-webhook, check-payment-status, process-checkout-direct, webhook-clicksign, omie-orchestrator. Documentação: `.context/modules/checkout/operational-events-n8n.md`.

- Campo `message` nos eventos operacionais (WhatsApp + vendedor + celebridade)  
  Payload inclui `message` (PT-BR, templates em `operational-events-message.ts`), enriquecimento `emitOperationalEventEnriched` + `operational-events-labels.ts`. Ver `.context/modules/checkout/operational-events-n8n.md`.

- Desligar WhatsApp de `checkout-audit-alerts` (plano Cursor)  
  Canal de saude/SLA gated por `WHATSAPP_ALERTS_ENABLED` (padrao off); sem fallback silencioso quando desligado. Auditoria `auditlogs_checkout_acelerai` mantida. Doc: `.context/modules/checkout/alertas-whatsapp/README.md`.

- Homologacao ai-step2 Campaign Generation (`2026-03-25-ai-campaign-homologation.md`)  
  Checklist de homologacao ponta a ponta para o pipeline de geracao de pecas (caso feliz, idempotencia, inelegibilidade, falha parcial, rate-limit, logs, rollback).

- Go-Live ai-step2 (`ai-step2_go-live_94ed414a.plan.md`, plano Cursor)  
  Plano executavel para levar pipeline ai-step2 ao estado operacional: modelo Gemini configuravel, limites de upload, migrations, deploy de 3 Edge Functions, versionamento global-rules, timeout e secrets.

- Orchestrator + Identity Persistence ai-step2 (`ai-step2_orchestrator_+_identity_e84fa105.plan.md`, plano Cursor)  
  Refatoracao da pipeline de geracao de imagens AI para pattern orquestrador com worker individual (resolve wall-clock limit). Persistencia completa dos inputs de identidade visual do onboarding (logo, cores, fonte, imagens, notas) no banco de dados com upload para Storage. Nova tabela `onboarding_identity`, bucket `onboarding-identity`, Edge Functions `save-onboarding-identity` (publica) e `generate-ai-campaign-image` (publica no gateway com `--no-verify-jwt`, autenticacao interna via bearer service role).

- `2026-03-30-omie-env-link-nfse.md`
  Fix: `cEnvLink` hardcoded `'N'` no bloco fiscal-only de `omie-create-os`. Campo separado de `cEnvBoleto`/`cEnvPix` (não é flag de pagamento). `omie-upsert-os` passa `enviarLinkNfse: true`.

- `2026-03-30-fix-dashboard-tsconfig-es2021.md`
  Fix: build do dashboard falha na Vercel — `tsconfig.app.json` com `target/lib ES2020` não reconhece `replaceAll` (ES2021). Eleva target e lib para ES2021.

## Historico

- `historico/2026-04-02-extracao-onboarding.md` — Guia executado para extrair apps/onboarding para repo próprio. Concluído.
- `2026-03-16-boletos-no-step-pagamento.md` — Niveis 1 e 2 implementados. Nivel 3 (gerar boleto admin) movido para `futuro/admin-generate-boleto.md`.

Os planos datados e materiais de execucao/review/report/spec foram removidos desta pasta durante a limpeza de documentacao.
                                                                                                                                                               