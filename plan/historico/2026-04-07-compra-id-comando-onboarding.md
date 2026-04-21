# Plano: atualizar `.cursor/commands/compra-id.md` (foco onboarding)

## Contexto

O comando atual orienta diagnóstico **comercial/pipeline** (`v_transaction_pipeline`, checkout, OMIE, NFS-e, ClickSign). O uso desejado é **jornada Primeiro Passo**: dados persistidos de identidade e briefing, uploads (paths), estado da geração de campanha, e evidências complementares — ainda ancorado em `compra_id` (UUID) via MCP Supabase, somente leitura.

Schema confirmado (produção, via MCP):

- `onboarding_identity` e `onboarding_briefings`: **UNIQUE(`compra_id`)** — no máximo uma linha cada por compra.
- `activity_logs.module`: enum **apenas** `checkout` | `contract` | `nfse` | `omie` — **não há módulo onboarding**; logs de “cada campo do formulário” não existem nessa tabela.
- `ai_campaign_jobs`: **sem UNIQUE em `compra_id`** — pode haver vários jobs; diagnóstico deve usar **último job** (`ORDER BY updated_at DESC LIMIT 1`) ou N recentes.

## Objetivo do comando (depois da atualização)

1. Em até **uma** resposta ao usuário, entregar diagnóstico **onboarding + pós-onboarding (job IA)** para o `compra_id` informado.
2. Minimizar roundtrips MCP: **1 query SQL principal** + no máximo **2** queries extras (ex.: último job + assets agregados, ou `activity_logs` + erros de campanha).

## O que mudar no arquivo (por seção)

### 1. Abertura e parâmetro

- Manter: busca via MCP Supabase, máxima performance, **somente leitura**, `$ARGUMENT` = UUID da compra.
- Ajustar o título/ primeira linha para deixar explícito: **diagnóstico onboarding / Primeiro Passo** (não “pipeline de transação” como foco).

### 2. Regras de execução — substituir prioridade de consulta

**Remover como foco principal:**

- Consulta única obrigatória em `v_transaction_pipeline`.
- Fallback genérico em `checkout_sessions` + `omie_sync` + `notas_fiscais` como bloco padrão.

**Definir nova prioridade:**

1. **Query principal (preferencial):** um único `SELECT` em `compras` com **`LEFT JOIN onboarding_identity oi ON oi.compra_id = compras.id`** e **`LEFT JOIN onboarding_briefings ob ON ob.compra_id = compras.id`**, filtro `WHERE compras.id = $compra_id`, colunas explícitas (sem `SELECT *`).
2. **Gate / contexto mínimo em `compras`:** pelo menos `id`, `cliente_id`, `checkout_status`, `clicksign_status`, `vendaaprovada` (e mais só se necessário para elegibilidade ou contexto operacional).
3. **Opcional — campanha IA:** subconsulta ou segunda query para **último** `ai_campaign_jobs` por `compra_id`; se existir job, opcionalmente contagens ou amostra de `ai_campaign_assets` / `ai_campaign_errors` com `LIMIT` e ordem por data.
4. **`activity_logs`:** filtrar por `compra_id`, `ORDER BY created_at DESC`, **`LIMIT`** (ex.: 50–100). Deixar claro no comando que isso cobre **checkout/contrato/NFSe/OMIE**, não “passo a passo” do SPA de onboarding.
5. **Falhas de upload/API:** instruir uso de **`get_logs`** (MCP Supabase) para Edge Functions relevantes (`save-onboarding-identity`, `save-campaign-briefing`, `get-onboarding-data`, etc.) quando o sintoma for erro de API, não dado ausente no SQL.

Manter: não alterar projeto/banco; evitar varredura de `information_schema` salvo erro de coluna; não repetir a mesma consulta; `limit` + ordenação descendente em tabelas de histórico.

### 3. Formato da resposta

Substituir o resumo executivo atual por blocos alinhados ao onboarding:

- **Resumo executivo:** elegibilidade (pagamento + contrato, se útil), **identidade** (presente/ausente/parcial), **briefing** (modo, texto/áudio, transcript/status), **último job de IA** (status, totais gerados/esperados), principais pendências.
- **Evidências:** `compra_id`, `cliente_id`, paths de storage (`logo_path`, `audio_path`, `campaign_images_paths` como lista), `updated_at` de identity/briefing, `job_id` se houver.
- **Alertas:** identidade incompleta, briefing com `error_code`/`status` problemático, job falho/parcial, erros recentes em `ai_campaign_errors` ou em logs de função — **não** centrar em divergência OMIE/NFS-e salvo pedido explícito.

Manter: se a compra não existir, mensagem clara **“compra não encontrada”**.

### 4. Checklist de dados mínimos — reescrever

Substituir o checklist comercial por colunas **confirmadas no schema**:

**`compras` (mínimo):** `id`, `cliente_id`, `checkout_status`, `clicksign_status`, `vendaaprovada` (e `valor_total` / `data_compra` apenas se útil ao contexto).

**`onboarding_identity`:** `choice`, `logo_path`, `brand_palette`, `font_choice`, `campaign_images_paths`, `campaign_notes`, `production_path`, `updated_at`.

**`onboarding_briefings`:** `mode`, `brief_text`, `audio_path`, `audio_duration_sec`, `transcript`, `transcript_status`, `status`, `error_code`, `briefing_json` (só se necessário), `updated_at`.

**`ai_campaign_jobs` (último):** `id`, `status`, `total_expected`, `total_generated`, `input_hash`, `updated_at`.

**Opcional:** amostra de `activity_logs` (módulo/evento/timestamp) e referência a `get_logs` para Edge.

### 5. Opcional — nome do arquivo

- Renomear para `.cursor/commands/onboarding-compra-id.md` (ou manter `compra-id.md` e atualizar só o conteúdo). **Decisão de equipe:** evita confundir com o comando antigo focado em pipeline.

## Ordem de implementação sugerida

1. Redigir novo texto completo do comando em `.cursor/commands/compra-id.md` (ou novo nome), incorporando seções acima.
2. Revisar com um `compra_id` real de teste (1 execução MCP) para validar que a query principal retorna o esperado sem JOIN cartesiano (garantido pelo UNIQUE em identity/briefing).
3. Se o time usar slash command por nome, atualizar referências internas (docs/README de Cursor) só se renomear o arquivo.

## Critério de pronto

- Comando não menciona `v_transaction_pipeline` como caminho principal.
- Comando documenta limitação de `activity_logs` (sem módulo onboarding) e quando usar `get_logs`.
- Checklist reflete colunas reais de `onboarding_identity`, `onboarding_briefings`, `ai_campaign_jobs`.
- Formato de resposta orienta resumo/evidências/alertas alinhados a onboarding + job IA.
