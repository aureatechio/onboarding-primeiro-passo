# Integracao Perplexity no Onboarding

## 1) Objetivo deste documento

Descrever o funcionamento ponta a ponta da integracao com Perplexity no onboarding e definir um plano de testes com criterios de aceite rastreaveis, otimizados para automacao com:

- Playwright (validacao de UX, fluxo e contrato HTTP no frontend)
- MCP Supabase (validacao de persistencia, status e rastreabilidade no banco)

---

## 2) Escopo funcional atual (estado observado no codigo)

### 2.1 Componentes e funcoes envolvidas

- Frontend:
  - `apps/onboarding/src/pages/Etapa7.jsx`
  - `apps/onboarding/src/components/CampaignBriefing.jsx`
- Edge Functions:
  - `supabase/functions/save-campaign-briefing/index.ts`
  - `supabase/functions/generate-campaign-briefing/index.ts`
- Persistencia:
  - tabela `onboarding_briefings`
  - bucket `onboarding-briefings` (quando ha audio)

### 2.2 Fluxo ponta a ponta

1. Usuario entra na Etapa 8 (`Modo avancado`) e escolhe caminho:
   - `standard`: segue sem briefing IA
   - `hybrid`: habilita bloco `CampaignBriefing`
2. No `hybrid`, usuario informa:
   - site oficial (`companySite`)
   - texto (>=80 e <=2000) e/ou audio (max 3 min, max 10 MB)
3. Ao acionar CTA, frontend executa:
   - `POST /functions/v1/save-campaign-briefing` (multipart) para persistir input bruto
   - `POST /functions/v1/generate-campaign-briefing` (json) para gerar briefing estruturado via Perplexity
4. `save-campaign-briefing`:
   - valida `compra_id`, `mode`, regras de texto/audio
   - opcionalmente sobe audio no storage
   - upsert em `onboarding_briefings` com status inicial `pending`
   - dispara `create-ai-campaign-job` em background (fire-and-forget)
5. `generate-campaign-briefing`:
   - valida contrato de entrada
   - grava estado `pending`
   - chama Perplexity `POST /chat/completions` server-side (nunca no browser)
   - normaliza output para contrato interno (`briefing`, `insights_pecas`, `citacoes`)
   - atualiza `onboarding_briefings` para `done` ou `error`
   - retorna `{ success: true, data }` ou erro deterministico
6. Frontend:
   - em sucesso: salva em `userData` (`campaignGeneratedBriefing`, `campaignGeneratedInsights`, `campaignBriefCitations`, status `done`)
   - em falha: salva erro (`campaignBriefErrorCode`, status `error`) e permite continuar jornada

### 2.3 Regras de negocio AUREA (observadas)

- Falha de provider nao bloqueia conclusao da etapa (fallback operacional).
- No modo `hybrid`, briefing de entrada (texto/audio) e salvo antes da tentativa IA.
- Site oficial valido e obrigatorio para gerar briefing IA.
- Persistencia deve manter rastreabilidade por `compra_id` e status (`pending|done|error`).

### 2.4 Contrato/comportamento do provider Perplexity (referencia API)

- Endpoint: `POST https://api.perplexity.ai/chat/completions`
- Payload base: `model`, `messages`, `search_mode`, `search_recency_filter`, `temperature`, `top_p` (e opcionais)
- Resposta relevante para integracao:
  - `choices[0].message.content` (conteudo textual)
  - `search_results[]` (citacoes/fontes)
  - `usage` (metrica de tokens)

### 2.5 Mapeamento de erros esperado

Codigos internos previstos em `generate-campaign-briefing`:

- `INVALID_INPUT` (400)
- `PERPLEXITY_PROVIDER_ERROR` (502)
- `PERPLEXITY_TIMEOUT` (504)
- `INVALID_PROVIDER_RESPONSE` (502)
- `INTERNAL_ERROR` (500)

---

## 3) Estrategia de automacao (Playwright + MCP Supabase)

## 3.1 Principios para testes estaveis

- Em Playwright, usar `getByRole` / texto visivel para locators.
- Usar web-first assertions (`toBeVisible`, `toHaveText`) em vez de waits fixos.
- Sincronizar chamadas HTTP com `waitForResponse` para endpoints de Edge Function.
- Isolar execucao por `compra_id` dedicado por rodada de teste.
- No MCP Supabase, validar estado final via `execute_sql` por `compra_id`.

## 3.2 Ferramentas MCP Supabase esperadas

- `execute_sql` (consulta de validacao no Postgres)
- `get_logs` (apoio para diagnostico)
- `get_edge_function` (auditoria de contrato/implementacao)

`project_id` padrao esperado: `awqtzoefutnfmnbomujt`

---

## 4) Criterios de aceite (AC) rastreaveis

Cada criterio tem ID unico para facilitar validacao automatica e relatorio.

### AC-FLOW-001: Exibicao de entrada no modo hybrid

- Dado que usuario seleciona `Personalizado (Avancado)` na Etapa 8
- Entao o bloco `Detalhes da campanha` deve aparecer com:
  - input de site oficial
  - abas `Texto` e `Audio`

### AC-FLOW-002: Validacao minima de texto

- Dado texto com menos de 80 caracteres
- Entao o fluxo nao deve considerar briefing textual valido
- E o indicador de pronto para texto nao deve ser exibido

### AC-FLOW-003: Validacao de URL para geracao IA

- Dado `hybrid` com texto/audio valido, mas `companySite` invalido
- Quando usuario aciona geracao
- Entao frontend deve marcar erro de geracao com codigo `INVALID_INPUT`
- E nao deve quebrar a navegacao da etapa

### AC-API-001: Persistencia de briefing bruto

- Quando CTA for acionado no `hybrid` com entrada valida
- Entao deve ocorrer `POST /functions/v1/save-campaign-briefing`
- E resposta HTTP deve ser sucesso (`2xx`) com `success=true`

### AC-API-002: Geracao via Perplexity

- Quando chamada de geracao for executada
- Entao deve ocorrer `POST /functions/v1/generate-campaign-briefing`
- E resposta deve conter:
  - `success` boolean
  - em sucesso: `data.briefing`, `data.insights_pecas`, `data.citacoes`
  - em erro: `code` deterministico

### AC-DATA-001: Estado final no banco (sucesso)

- Dado fluxo com sucesso de geracao
- Entao `onboarding_briefings` para o `compra_id` deve conter:
  - `status = 'done'`
  - `provider = 'perplexity'`
  - `briefing_json` nao nulo
  - `contract_version`, `prompt_version`, `strategy_version` nao nulos

### AC-DATA-002: Estado final no banco (erro controlado)

- Dado falha de provider/timeout/resposta invalida
- Entao `onboarding_briefings` deve conter:
  - `status = 'error'`
  - `error_code` em conjunto permitido
- E frontend deve permitir continuar sem bloqueio fatal

### AC-DATA-003: Citacoes quando disponiveis

- Dado que provider retorna `search_results`
- Entao `citations_json` deve armazenar os itens normalizados
- E frontend deve refletir contagem de citacoes no preview

### AC-SEC-001: Segredo fora do frontend

- Em toda execucao E2E, nao deve existir uso de `PERPLEXITY_API_KEY` no browser
- Chave deve permanecer apenas na Edge Function

---

## 5) Casos de teste automatizaveis

## CT-01: Caminho happy path (hybrid + texto valido + URL valida)

Objetivo: validar fluxo completo com geracao bem-sucedida.

Passos (Playwright):

1. Abrir onboarding com `compra_id` dedicado.
2. Navegar ate Etapa 8.
3. Selecionar `Personalizado (Avancado)`.
4. Preencher site oficial valido.
5. Preencher texto >= 80 caracteres.
6. Acionar CTA `Gerar briefing IA`.
7. Aguardar `waitForResponse` de:
   - `**/functions/v1/save-campaign-briefing`
   - `**/functions/v1/generate-campaign-briefing`
8. Validar UI de sucesso (`Briefing IA gerado com sucesso`).

Validacoes MCP Supabase (`execute_sql`):

```sql
select
  compra_id,
  status,
  provider,
  provider_model,
  contract_version,
  prompt_version,
  strategy_version,
  (briefing_json is not null) as has_briefing_json,
  jsonb_array_length(coalesce(citations_json, '[]'::jsonb)) as citations_count
from onboarding_briefings
where compra_id = '<COMPRA_ID_TESTE>';
```

Esperado:

- `status = done`
- `provider = perplexity`
- `has_briefing_json = true`
- versoes preenchidas

## CT-02: URL invalida impede geracao IA (erro controlado)

Objetivo: validar gate de URL no frontend.

Passos (Playwright):

1. Repetir fluxo ate Etapa 8 em `hybrid`.
2. Informar URL invalida (ex.: `site-sem-protocolo.com`).
3. Informar texto valido.
4. Acionar CTA.

Esperado (Playwright):

- Banner/feedback de erro de geracao.
- Estado local `campaignBriefGenerationStatus` equivalente a erro.
- Jornada continua navegavel.

Esperado (MCP SQL):

- Opcionalmente `save-campaign-briefing` pode existir com status inicial.
- Nao deve haver crash nem estado inconsistente.

## CT-03: Falha de provider mapeada com codigo deterministico

Objetivo: validar resiliencia operacional.

Execucao recomendada:

- Simular falha em ambiente de teste (ex.: chave invalida/timeout controlado).

Esperado:

- resposta de `generate-campaign-briefing` com `success=false` e `code` permitido
- `onboarding_briefings.status = error`
- `onboarding_briefings.error_code` preenchido
- UI exibe erro e permite concluir

Consulta SQL:

```sql
select
  compra_id,
  status,
  error_code,
  provider,
  updated_at
from onboarding_briefings
where compra_id = '<COMPRA_ID_TESTE>';
```

## CT-04: Persistencia de citacoes

Objetivo: garantir rastreabilidade de fontes.

Pre-condicao:

- rodada em que provider retorne `search_results`.

Esperado:

- `citations_json` com tamanho > 0 no banco.
- preview da UI exibe contador de citacoes > 0.

---

## 6) Checklist de aprovacao da rodada automatica

- [ ] Todos os testes Playwright passaram sem flake.
- [ ] Nenhum erro HTTP 5xx nao esperado nas duas Edge Functions.
- [ ] Banco validado via MCP (`execute_sql`) para todos os ACs de dados.
- [ ] Nao houve vazamento de segredo no frontend/log de browser.
- [ ] Resultado final consolidado por `compra_id` testado.

---

## 7) Modelo de saida padrao para pipeline de validacao

Formato sugerido (JSON) para consolidar resultado automatico:

```json
{
  "suite": "onboarding-perplexity-e2e",
  "run_at": "ISO-8601",
  "compra_id": "uuid",
  "result": "pass | fail | partial",
  "acceptance": [
    { "id": "AC-FLOW-001", "status": "pass", "evidence": "playwright" },
    { "id": "AC-API-001", "status": "pass", "evidence": "network-response" },
    { "id": "AC-DATA-001", "status": "pass", "evidence": "mcp-execute-sql" }
  ],
  "errors": []
}
```

---

## 8) Referencias usadas para este documento

- Codigo:
  - `apps/onboarding/src/pages/Etapa7.jsx`
  - `apps/onboarding/src/components/CampaignBriefing.jsx`
  - `supabase/functions/save-campaign-briefing/index.ts`
  - `supabase/functions/generate-campaign-briefing/index.ts`
- Contratos/contexto interno:
  - `.context/modules/onboarding/perplexity/README.md`
  - `.context/modules/onboarding/perplexity/CONTEXT-STRATEGY.md`
  - `.context/modules/onboarding/perplexity/CONTRACT.md`
  - `.context/modules/ai/perplexity/README.md`
  - `.context/modules/onboarding/README.md`
  - `apps/onboarding/README.md`
  - `apps/onboarding/onboarding.md`
- Documentacao provider (Context7):
  - `/websites/perplexity_ai_api-reference` (chat completions)
- Documentacao automacao (Context7):
  - `/microsoft/playwright.dev` (best practices e web-first assertions)
