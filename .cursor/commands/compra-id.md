Busque a compra `$ARGUMENT` (UUID) via MCP Supabase com **máxima performance** e **somente leitura**.

Foco: **diagnóstico onboarding (Primeiro Passo)** — identidade visual, briefing, uploads (paths no banco), job de campanha IA — não pipeline comercial/OMIE/NFS-e como objetivo principal.

Objetivo:
1) Trazer diagnóstico de onboarding + último job de IA em até 1 resposta.
2) Minimizar roundtrips MCP (ideal: **1 query principal** + no máximo **2** queries extras).

Regras de execução:
- NÃO alterar nada no projeto nem no banco.
- NÃO fazer varredura ampla de schema por padrão.
- **Query principal (preferencial):** um único `SELECT` em `compras` com `LEFT JOIN onboarding_identity oi ON oi.compra_id = compras.id` e `LEFT JOIN onboarding_briefings ob ON ob.compra_id = compras.id`, filtro `WHERE compras.id = '<uuid>'`, apenas colunas necessárias (evitar `SELECT *`). `onboarding_identity` e `onboarding_briefings` têm no máximo **uma linha por compra** (UNIQUE em `compra_id`).
- **Se precisar de campanha IA:** segunda query (ou subconsulta) para o **último** `ai_campaign_jobs` da compra: `ORDER BY updated_at DESC LIMIT 1`. Pode haver vários jobs no histórico. Opcional: amostra de `ai_campaign_assets` / `ai_campaign_errors` com `LIMIT` e ordem por data.
- **`activity_logs`:** `WHERE compra_id = '<uuid>'`, `ORDER BY created_at DESC`, `LIMIT` (ex.: 50–100). O enum `module` cobre apenas **checkout | contract | nfse | omie** — **não existe módulo onboarding**; isso não substitui log passo a passo do SPA.
- **Erro de upload/API (Edge):** usar **`get_logs`** do MCP para funções como `save-onboarding-identity`, `save-campaign-briefing`, `get-onboarding-data` quando o problema for falha de função, não linha ausente no SQL.
- Só consultar `information_schema` se houver erro de coluna/tabela.
- Não repetir consultas já realizadas na mesma execução.

Formato da resposta:
- **Resumo executivo:** elegibilidade (pagamento + contrato, se útil), identidade (presente/ausente/parcial), briefing (modo, texto/áudio, transcript), último job IA (status, totais), pendências.
- **Evidências:** IDs, paths (`logo_path`, `audio_path`, `campaign_images_paths`), `updated_at` relevantes, `job_id` se houver.
- **Alertas:** identidade incompleta, briefing com `error_code`/`status` ruim, job falho/parcial, erros recentes em campanha — **não** focar em OMIE/NFS-e salvo pedido explícito.
- Se não existir linha em `compras`, informar claramente **“compra não encontrada”**.

Checklist de dados mínimos:
- **compras:** `id`, `cliente_id`, `checkout_status`, `clicksign_status`, `vendaaprovada` (+ `valor_total` / `data_compra` se útil ao contexto)
- **onboarding_identity:** `choice`, `logo_path`, `brand_palette`, `font_choice`, `campaign_images_paths`, `campaign_notes`, `production_path`, `updated_at`
- **onboarding_briefings:** `mode`, `brief_text`, `audio_path`, `audio_duration_sec`, `transcript`, `transcript_status`, `status`, `error_code`, `updated_at` (`briefing_json` só se necessário)
- **ai_campaign_jobs (último):** `id`, `status`, `total_expected`, `total_generated`, `input_hash`, `updated_at`
- **Opcional:** amostra `activity_logs` (`module`, `event`, `created_at`, `is_error`) e `get_logs` (Edge)
