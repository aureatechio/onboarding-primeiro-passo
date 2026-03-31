# Bug Log - Integracao Perplexity (2026-03-31)

## Contexto da validacao

- Ambiente: `http://localhost:5173`
- Compra testada: `42a4e250-1dfb-404e-b0c3-67fb1e7e0761`
- Fluxo executado: Etapa 8 (`Modo avancado`) -> `Personalizado (Avancado)` -> envio de briefing -> geracao IA
- Ferramentas: Playwright MCP + Supabase MCP

## BUG-001 - Trigger interno retorna 409 durante save-campaign-briefing

### Severidade

- Baixa/Media (nao bloqueia a geracao de briefing, mas indica conflito operacional no trigger de job)

### Evidencia

- Requisicao frontend:
  - `POST /functions/v1/save-campaign-briefing` -> `200`
- Logs de Edge Function (MCP `get_logs`):
  - `POST /functions/v1/create-ai-campaign-job` -> `409`
  - Timestamp da ocorrencia: aproximadamente `1774963847365000`

### Comportamento observado

- O salvamento do briefing conclui com sucesso.
- A geracao de briefing IA tambem conclui (`POST /functions/v1/generate-campaign-briefing` -> `200`).
- Porem, o trigger interno de criacao de job do ai-step2 retorna conflito (`409`) no mesmo fluxo.

### Comportamento esperado

- O trigger interno deveria:
  - retornar `200/202` em caso de idempotencia, ou
  - tratar explicitamente "job ja existente" sem registrar como erro operacional ambiguo.

### Impacto potencial

- Ruido operacional em monitoramento/logs.
- Dificulta diferenciar falha real versus conflito idempotente esperado.

### Proxima investigacao sugerida

1. Verificar contrato do `create-ai-campaign-job` para cenarios de idempotencia.
2. Confirmar se `409` e esperado quando ja existe job para o `compra_id`.
3. Se for esperado, ajustar semantica/log para nao parecer erro.

Em termos simples: o sistema conseguiu salvar o briefing e gerar o resultado com IA normalmente, mas no meio do caminho apareceu um aviso tecnico de "conflito" (erro 409) ao tentar criar um job que possivelmente ja existia. Ou seja, para o usuario final funcionou, mas para quem monitora os logs fica parecendo erro e isso pode confundir a operacao.

