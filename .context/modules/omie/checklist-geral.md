# Checklist Geral OMIE (feito vs faltante)

## Como usar

- `[x]` item concluido e validado por evidencia de codigo/documentacao.
- `[ ]` item pendente.
- Evidencia aponta para arquivo/funcao/plano de referencia.

## A) Fluxo principal (implementacao)

- [x] Trigger fiscal por pagamento efetivo em metodo unico.  
  Evidencia: `supabase/functions/process-checkout/index.ts`, `supabase/functions/check-payment-status/index.ts`, `supabase/functions/cielo-webhook/index.ts`.
- [x] Trigger fiscal em split com primeira sessao paga (`sessoes_pagas >= 1`).  
  Evidencia: `supabase/functions/_shared/split.ts` (`shouldTriggerOmieEmission`).
- [x] Fallback defensivo do helper de split para nao perder faturamento.  
  Evidencia: `supabase/functions/_shared/split.ts` (`split_counter_pending_after_completed`, `split_group_*_fallback`).
- [x] Trigger fire-and-forget centralizado para `omie-orchestrator`.  
  Evidencia: `supabase/functions/_shared/pipeline/trigger-nfe.ts`.
- [x] Orquestracao `cliente -> servico -> OS` implementada.  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`.
- [x] Polling `StatusOS` com atualizacao para `Issued`, `Error` ou `awaiting_nfse`.  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`.
- [x] Obtencao de documentos por `ObterNFSe` com persistencia em `notas_fiscais`.  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`.
- [x] Idempotencia por compra via `omie_sync.compra_id`.  
  Evidencia: fluxo de leitura/atualizacao em `supabase/functions/omie-orchestrator/index.ts`.

## B) Retry e recuperacao

- [x] Retry manual com `force=true` disponivel (dashboard).  
  Evidencia: `apps/dashboard/src/components/StepDetail.tsx`.
- [x] Upsert corretivo de OS por `compra_id` com fonte no banco (`AlterarOS`/`IncluirOS`).  
  Evidencia: `supabase/functions/omie-upsert-os/index.ts`.
- [x] Preview read-only de upsert por `compra_id` no dashboard (sem side effects).  
  Evidencia: `supabase/functions/omie-preview-upsert-os/index.ts`, `apps/dashboard/src/pages/OmieUpsertOs.tsx`.
- [x] Retry worker implementado para notas `awaiting_nfse`.  
  Evidencia: `supabase/functions/omie-nfse-retry-worker/index.ts`.
- [x] Worker aplica cooldown, batch e limite de tentativas.  
  Evidencia: `supabase/functions/omie-nfse-retry-worker/index.ts`.
- [~] Scheduler/cron de execucao periodica do worker validado em todos os ambientes ativos.  
  Evidencia: migration `supabase/migrations/20260226113000_schedule_omie_sync_vendedores_daily.sql` cobre sync de vendedores; validacao operacional completa do retry worker depende de evidencias de runtime. → [TASK-2026-04-02-008](../tasks/TASK-2026-04-02-008-validacao-retry-worker-producao.md)
- [~] `OMIE_AUTO_RETRY_ENABLED=true` validado em producao.  
  Evidencia esperada: variaveis de ambiente do runtime (fora do repositorio). → [TASK-2026-04-02-008](../tasks/TASK-2026-04-02-008-validacao-retry-worker-producao.md)

## C) Configuracao fiscal

- [x] Tabela `omie_nfse_config` criada com config ativa unica.  
  Evidencia: `supabase/migrations/20260220100000_create_omie_nfse_config.sql`.
- [x] APIs admin para leitura/atualizacao da config ativa.  
  Evidencia: `supabase/functions/get-omie-nfse-config/index.ts`, `supabase/functions/update-omie-nfse-config/index.ts`.
- [x] Tela de configuracao no dashboard para campos atuais.  
  Evidencia: `apps/dashboard/src/pages/OmieNfseConfig.tsx`.
- [x] Parametros de categoria/conta propagados no payload da OS com fallback seguro.  
  Evidencia: `supabase/functions/omie-create-os/index.ts`.

## D) Operacao e observabilidade

- [x] Estados operacionais persistidos em `omie_sync` e `notas_fiscais`.  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`.
- [x] SQLs de monitoramento definidos no runbook operacional.  
  Evidencia: `.context/modules/omie/NFSE-OPERACAO-OMIE.md`.
- [x] Codigos de erro e cenarios de incidente documentados.  
  Evidencia: `.context/modules/omie/README.md`, `.context/modules/omie/NFSE-OPERACAO-OMIE.md`.
- [x] Auditoria operacional de preview/execucao de upsert em `notas_fiscais_logs`.  
  Evidencia: `supabase/functions/omie-preview-upsert-os/index.ts`, `supabase/functions/omie-upsert-os/index.ts`.
- [ ] Calibracao final dos parametros de polling por metrica real (p95/awaiting rate).  
  Evidencia de pendencia: `plan/BACKLOG-migracao-nfse-nfeio-para-omie.md`. → [TASK-2026-04-02-006](../tasks/TASK-2026-04-02-006-calibracao-polling-omie.md)

## E) Documentacao (aderencia ao padrao de modulo)

- [x] `README.md` consolidado sem duplicacao e alinhado ao codigo atual.
- [x] Runbook operacional consolidado sem duplicacao e alinhado ao estado implementado.
- [x] Checklist consolidado como fonte unica de acompanhamento.
- [x] Separacao explicita entre contexto canonico (README) e operacao diaria (runbook/checklist).

## F) Legado NFe.io e descomissionamento

- [x] Trigger principal por pagamento aponta para OMIE (`omie-orchestrator`).  
  Evidencia: `supabase/functions/_shared/pipeline/trigger-nfe.ts`.
- [x] Caminho legado removido (NFe.io descomissionado).
  Evidencia: Fase 4 do backlog concluida — Edge Functions, tabelas, shared e app deletados.
- [x] Plano de desligamento completo do legado executado.
  Evidencia: `plan/BACKLOG-migracao-nfse-nfeio-para-omie.md` (Fase 4 concluida 2026-03-02).

## G) Pendencias prioritarias (curto prazo)

- [ ] Consolidar evidencia operacional do retry worker em producao (jobs, taxa de sucesso, falhas). → [TASK-2026-04-02-008](../tasks/TASK-2026-04-02-008-validacao-retry-worker-producao.md)
- [x] Corte do caminho legado NFe.io executado (Fase 4 concluida 2026-03-02).
- [ ] Calibrar polling por metricas reais e registrar baseline.
- [ ] Validar ciclo completo de sync de vendedores com evidencia (`inserted/updated/inactivated/errors`). → [TASK-2026-04-02-007](../tasks/TASK-2026-04-02-007-validacao-sync-vendedores.md)

## H) Sync diario de vendedores OMIE (24h)

- [x] API OMIE de vendedores validada (`ListarVendedores` / `VendedoresCadastro`).  
  Evidencia: `supabase/functions/omie-sync-vendedores/index.ts`, `supabase/functions/omie-push-vendedores/index.ts`.
- [x] Periodicidade operacional definida em 24h.  
  Evidencia: `supabase/migrations/20260226113000_schedule_omie_sync_vendedores_daily.sql`.
- [x] Migration com mapeamento OMIE em `public.vendedores`.  
  Evidencia: `supabase/migrations/20260226110000_add_omie_fields_to_vendedores.sql`.
- [x] Migration de idempotencia para push em `public.vendedores` (`omie_cod_int`).  
  Evidencia: `supabase/migrations/20260305110000_add_omie_cod_int_to_vendedores.sql`.
- [x] Migration de agendamento diario push -> pull.  
  Evidencia: `supabase/migrations/20260305113000_schedule_omie_push_vendedores_daily.sql`.
- [x] Edge Function `omie-push-vendedores` implementada.  
  Evidencia: `supabase/functions/omie-push-vendedores/index.ts`.
- [x] Edge Function `omie-sync-vendedores` implementada.  
  Evidencia: `supabase/functions/omie-sync-vendedores/index.ts`.
- [x] Integracao de mapeamento no orquestrador com fallback sem bloqueio.  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`, `supabase/functions/omie-create-os/index.ts`.
- [x] Telemetria explicita para ausencia de mapeamento de vendedor OMIE (`omie_usuario_codigo`).  
  Evidencia: `supabase/functions/omie-orchestrator/index.ts`, `supabase/functions/omie-upsert-os/index.ts` (logs `OMIE_VENDEDOR` com `motivo`).
- [ ] Validar 1 ciclo completo em homologacao e 1 ciclo em producao com evidencias operacionais. → [TASK-2026-04-02-007](../tasks/TASK-2026-04-02-007-validacao-sync-vendedores.md)
