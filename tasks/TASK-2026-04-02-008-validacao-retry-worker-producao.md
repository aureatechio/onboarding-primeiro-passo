---
id: TASK-2026-04-02-008
title: "Validar evidencia operacional do retry worker OMIE em producao"
status: triagem
priority: alta
modulo: omie
origem: backlog
reportado-por: checklist-geral
data-criacao: 2026-04-02
data-enriquecimento:
data-aprovacao:
data-conclusao:
scale: SMALL
arquivos-alvo:
  - supabase/functions/omie-nfse-retry-worker/index.ts
  - .context/modules/omie/checklist-geral.md
  - .context/modules/omie/NFSE-OPERACAO-OMIE.md
related-plan: ""
---

# TASK-2026-04-02-008: Validar evidencia operacional do retry worker OMIE em producao

## Relato Original

> **Preenchido por:** checklist-geral automatico (backlog)
> **Fonte:** backlog

**Descricao:**

O checklist-geral marca como pendente: "Consolidar evidencia operacional do retry worker em producao (jobs, taxa de sucesso, falhas)".

O `omie-nfse-retry-worker` esta implementado e o scheduler/cron esta configurado, mas nao ha evidencia documentada de que o worker esta processando notas `awaiting_nfse` com sucesso em producao.

## Contexto Tecnico

**Funcao:** `omie-nfse-retry-worker`
- Reprocessa em lote notas com `omie_status = 'awaiting_nfse'`
- Aplica cooldown entre tentativas
- Usa `force=true` no orchestrator para reprocessar
- Limite de tentativas configuravel

**Env var critica:** `OMIE_AUTO_RETRY_ENABLED=true` (deve estar em producao)

**Scheduler:** configurado via pg_cron (migration existente)

## Plano de Execucao

1. Verificar env var em producao:
   ```bash
   supabase secrets list --project-ref awqtzoefutnfmnbomujt | grep OMIE_AUTO_RETRY
   ```

2. Consultar notas `awaiting_nfse` em producao:
   ```sql
   SELECT COUNT(*), MIN(created_at), MAX(updated_at)
   FROM omie_sync
   WHERE omie_status = 'awaiting_nfse';
   ```

3. Verificar logs do worker nos ultimos 7 dias (Supabase Dashboard → Edge Functions → omie-nfse-retry-worker)

4. Se houver notas `awaiting_nfse`, executar worker manualmente e capturar response:
   ```bash
   curl -X POST https://awqtzoefutnfmnbomujt.supabase.co/functions/v1/omie-nfse-retry-worker \
     -H "Authorization: Bearer <service-role-key>"
   ```

5. Documentar metricas: jobs executados, taxa de sucesso, falhas persistentes

## Criterio de Conclusao

- [ ] `OMIE_AUTO_RETRY_ENABLED=true` confirmado em producao
- [ ] Evidencia de execucao do worker (logs ou response capturado)
- [ ] Taxa de sucesso documentada
- [ ] Evidencia registrada no `checklist-geral.md` (linhas 40-43)
