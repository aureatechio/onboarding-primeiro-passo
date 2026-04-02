---
id: TASK-2026-04-02-006
title: "Calibrar parametros de polling OMIE por metricas reais de producao"
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
  - supabase/functions/omie-orchestrator/index.ts
  - .context/modules/omie/AJUSTE-INICIAL-POLLING-OMIE.md
  - .context/modules/omie/checklist-geral.md
related-plan: ""
---

# TASK-2026-04-02-006: Calibrar parametros de polling OMIE por metricas reais de producao

## Relato Original

> **Preenchido por:** checklist-geral automatico (backlog)
> **Fonte:** backlog

**Descricao:**

O checklist-geral marca como pendente: "Calibracao final dos parametros de polling por metrica real (p95/awaiting rate)".

Os parametros atuais foram definidos antes de producao real. Com dados reais acumulados, e possivel calibrar os delays e timeouts para reduzir `awaiting_nfse` desnecessarios e otimizar o tempo de espera.

## Contexto Tecnico

**Parametros atuais (defaults):**
- `OMIE_STATUS_POLL_DELAYS_MS=3000,7000,12000,20000`
- `OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS=6000`

**Configuravel via env vars** (sem deploy de codigo).

**Metrica alvo:**
- p95 do tempo de resposta da OMIE para `StatusOS`
- Taxa de `awaiting_nfse` (notas que precisaram de retry)
- Taxa de `003` (erros da prefeitura) vs `004` (sucesso)

## Plano de Execucao

1. Consultar banco em producao:
   ```sql
   -- p95 de tempo entre criacao da OS e status final
   SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY
     EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000
   ) as p95_ms
   FROM omie_sync
   WHERE omie_status IN ('synced', 'failed')
   AND updated_at > NOW() - INTERVAL '30 days';
   
   -- Taxa de awaiting_nfse
   SELECT
     COUNT(*) FILTER (WHERE omie_status = 'awaiting_nfse') as awaiting,
     COUNT(*) as total
   FROM omie_sync
   WHERE created_at > NOW() - INTERVAL '30 days';
   ```

2. Com base nas metricas, ajustar env vars no Supabase (nao requer deploy)

3. Registrar baseline e novos valores em `.context/modules/omie/AJUSTE-INICIAL-POLLING-OMIE.md`

## Criterio de Conclusao

- [ ] Metricas de p95 coletadas e documentadas
- [ ] Parametros ajustados ou confirmados como adequados
- [ ] Evidencia registrada no `checklist-geral.md`
