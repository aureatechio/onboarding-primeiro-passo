---
id: TASK-2026-04-02-007
title: "Validar ciclo completo de sync de vendedores em homologacao e producao"
status: triagem
priority: media
modulo: omie
origem: backlog
reportado-por: checklist-geral
data-criacao: 2026-04-02
data-enriquecimento:
data-aprovacao:
data-conclusao:
scale: SMALL
arquivos-alvo:
  - supabase/functions/omie-push-vendedores/index.ts
  - supabase/functions/omie-sync-vendedores/index.ts
  - .context/modules/omie/checklist-geral.md
related-plan: ""
---

# TASK-2026-04-02-007: Validar ciclo completo de sync de vendedores em homologacao e producao

## Relato Original

> **Preenchido por:** checklist-geral automatico (backlog)
> **Fonte:** backlog

**Descricao:**

O checklist-geral marca como pendente: "Validar 1 ciclo completo em homologacao e 1 ciclo em producao com evidencias operacionais (`inserted/updated/inactivated/errors`)".

As Edge Functions `omie-push-vendedores` e `omie-sync-vendedores` foram implementadas e agendadas, mas nao ha evidencia documentada de um ciclo completo bem-sucedido com metricas reais.

## Contexto Tecnico

**Fluxo do ciclo:**
1. `omie-push-vendedores` (DB → OMIE): cria/atualiza vendedores locais na OMIE, persiste `omie_usuario_codigo`
2. `omie-sync-vendedores` (OMIE → DB): concilia lista OMIE com `public.vendedores`, inativa ausentes

**Agendamento:** migration `20260305113000_schedule_omie_push_vendedores_daily.sql` (24h)

**Metricas esperadas no response:**
- `push`: `created`, `updated`, `linked`, `skipped_invalid`, `errors`
- `sync`: `inserted`, `updated`, `inactivated`, `errors`, `elapsed_ms`

## Plano de Execucao

1. Executar push em modo `preview` em homologacao para validar sem side effects
2. Executar push em modo `apply` em producao (ou aguardar ciclo agendado)
3. Executar sync em producao (ou aguardar ciclo agendado)
4. Capturar response completo das duas funcoes
5. Verificar no banco: `SELECT id, nome, omie_usuario_codigo, omie_ativo, omie_last_sync_at FROM vendedores WHERE omie_last_sync_at IS NOT NULL LIMIT 10;`
6. Documentar evidencia em checklist-geral.md

## Criterio de Conclusao

- [ ] 1 ciclo push validado com `errors=0`
- [ ] 1 ciclo sync validado com metricas coerentes
- [ ] Evidencia registrada no `checklist-geral.md` (linha 112)
