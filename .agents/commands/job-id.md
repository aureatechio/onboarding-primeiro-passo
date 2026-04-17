Busque o job de campanha IA `$ARGUMENT` (UUID de `ai_campaign_jobs.id`) via MCP Supabase com **máxima performance** e **somente leitura**.

Foco: **diagnóstico completo de um job específico** — status, progresso, assets gerados, erros, dados de onboarding vinculados — tudo a partir do `job_id`.

Objetivo:
1) Trazer diagnóstico detalhado do job + contexto de onboarding em até 1 resposta.
2) Minimizar roundtrips MCP (ideal: **2 queries** + no máximo **1** query extra).

Regras de execução:
- NÃO alterar nada no projeto nem no banco.
- NÃO fazer varredura ampla de schema por padrão.

- **Query 1 — Job + Compra + Onboarding (JOIN único):**
  ```sql
  SELECT
    j.id              AS job_id,
    j.compra_id,
    j.status          AS job_status,
    j.total_expected,
    j.total_generated,
    j.prompt_version,
    j.input_hash,
    j.created_at      AS job_created_at,
    j.updated_at      AS job_updated_at,
    c.checkout_status,
    c.clicksign_status,
    c.vendaaprovada,
    c.cliente_id,
    c.celebridade      AS celebridade_id,
    oi.choice          AS identity_choice,
    oi.logo_path,
    oi.brand_palette,
    oi.font_choice,
    oi.campaign_images_paths,
    oi.campaign_notes,
    oi.production_path,
    oi.updated_at      AS identity_updated_at,
    ob.mode            AS briefing_mode,
    ob.brief_text,
    ob.audio_path,
    ob.audio_duration_sec,
    ob.transcript,
    ob.transcript_status,
    ob.status          AS briefing_status,
    ob.provider        AS briefing_provider,
    ob.updated_at      AS briefing_updated_at
  FROM ai_campaign_jobs j
  LEFT JOIN compras c             ON c.id = j.compra_id
  LEFT JOIN onboarding_identity oi ON oi.compra_id = j.compra_id
  LEFT JOIN onboarding_briefings ob ON ob.compra_id = j.compra_id
  WHERE j.id = '<uuid>'
  ```
  Se não retornar linhas: informar **"job não encontrado"** e encerrar.

- **Query 2 — Assets + Erros do job (duas subconsultas em uma):**
  Fazer as duas queries em paralelo (ou sequencial se MCP não suportar):

  **Assets:**
  ```sql
  SELECT id, group_name, format, status, image_url, width, height, prompt_version, created_at
  FROM ai_campaign_assets
  WHERE job_id = '<uuid>'
  ORDER BY group_name, format
  ```

  **Erros:**
  ```sql
  SELECT id, group_name, format, error_type, error_message, attempt, created_at
  FROM ai_campaign_errors
  WHERE job_id = '<uuid>'
  ORDER BY created_at DESC
  LIMIT 30
  ```

- **Query extra (opcional):** Se houver `cliente_id` ou `celebridade_id` na Query 1, buscar nomes:
  ```sql
  SELECT id, nome, nome_fantasia FROM clientes WHERE id = '<cliente_id>'
  ```
  ```sql
  SELECT id, nome FROM "celebridadesReferencia" WHERE id = '<celebridade_id>'
  ```
  Combinar em uma única query se possível. Só executar se os IDs existirem.

- **`get_logs` (Edge):** usar apenas se houver erro suspeito e o usuário pedir, para funções como `create-ai-campaign-job`, `generate-ai-campaign-image`, `retry-ai-campaign-assets`.
- Só consultar `information_schema` se houver erro de coluna/tabela.
- Não repetir consultas já realizadas na mesma execução.

Formato da resposta:

- **Resumo executivo:**
  - **Job:** status (`pending`/`processing`/`completed`/`partial`/`failed`), progresso (`total_generated`/`total_expected` = X%), `prompt_version`, idade do job
  - **Compra:** elegibilidade (pagamento + contrato), cliente (nome), celebridade (nome)
  - **Identidade:** presente/ausente/parcial (`choice`, logo, paleta, fontes, imagens de campanha)
  - **Briefing:** modo (texto/áudio), status, provider, transcript (presente/ausente)
  - **Pendências/Alertas**

- **Assets (tabela):**
  | grupo | formato | status | image_url (path) | dimensões |
  Agrupar por `group_name` (moderna, clean, retail). Indicar assets faltantes (esperados: 3 grupos × 4 formatos = 12).

- **Erros (se houver):**
  | error_type | group:format | mensagem (resumida) | quando |
  Destacar `failure_source` (worker / storage / provider / stale).

- **Diagnósticos:**
  - `job_failed_with_processing_assets` — job falhou mas tem assets em pending/processing
  - `job_failed_without_errors` — job falhou sem nenhum erro registrado
  - `failed_assets_without_error_records` — assets falharam sem erro correspondente
  - `stuck_assets_detected` — assets em pending/processing há >10 min (comparar `created_at` dos assets com agora)
  - Contagem de erros por `error_type`

- **Evidências:** IDs, paths relevantes (`logo_path`, `audio_path`, `campaign_images_paths`, `image_url` dos assets), timestamps.
- Se não existir job, informar claramente **"job não encontrado"**.

Checklist de dados mínimos:
- **ai_campaign_jobs:** `id`, `compra_id`, `status`, `total_expected`, `total_generated`, `prompt_version`, `input_hash`, `created_at`, `updated_at`
- **compras:** `checkout_status`, `clicksign_status`, `vendaaprovada`, `cliente_id`, `celebridade`
- **onboarding_identity:** `choice`, `logo_path`, `brand_palette`, `font_choice`, `campaign_images_paths`, `campaign_notes`, `production_path`, `updated_at`
- **onboarding_briefings:** `mode`, `brief_text`, `audio_path`, `audio_duration_sec`, `transcript`, `transcript_status`, `status`, `provider`, `updated_at`
- **ai_campaign_assets (todos do job):** `id`, `group_name`, `format`, `status`, `image_url`, `width`, `height`, `prompt_version`, `created_at`
- **ai_campaign_errors (últimos 30):** `id`, `group_name`, `format`, `error_type`, `error_message`, `attempt`, `created_at`
- **Opcional:** nomes de cliente/celebridade via `clientes` e `celebridadesReferencia`
