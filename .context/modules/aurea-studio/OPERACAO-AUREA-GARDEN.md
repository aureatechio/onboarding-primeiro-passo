# Aurea Garden — Runbook Operacional

## Monitoramento Diario

### Verificar jobs falhados recentes

```sql
SELECT id, tool, status, error_code, error_message, duration_ms, created_at
FROM garden_jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Verificar jobs stuck (processing ha mais de 5 min)

```sql
SELECT id, tool, status, request_id, created_at,
       EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_stuck
FROM garden_jobs
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;
```

**Acao:** Jobs stuck provavelmente falharam silenciosamente (crash na Edge Function). Marcar como failed manualmente:

```sql
UPDATE garden_jobs
SET status = 'failed',
    error_code = 'INTERNAL_ERROR',
    error_message = 'Job stuck — marcado manualmente como failed.'
WHERE id = '<job_id>'
  AND status = 'processing';
```

### Metricas de saude

```sql
-- Taxa de sucesso ultimas 24h por tool
SELECT tool,
       COUNT(*) FILTER (WHERE status = 'completed') AS ok,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) AS total,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) AS success_rate,
       ROUND(AVG(duration_ms) FILTER (WHERE status = 'completed'), 0) AS avg_duration_ms
FROM garden_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tool;
```

## Diagnostico de Jobs Falhados

### 1. Identificar o tipo de falha pelo error_code

| error_code | Significado | Acao |
|------------|-------------|------|
| `INVALID_INPUT` | Dados invalidos chegaram no backend | Verificar frontend ou chamada direta |
| `UPLOAD_ERROR` | Bucket `aurea-garden-assets` com problema | Verificar permissoes e espaco do bucket |
| `PROVIDER_ERROR` | Gemini retornou erro ou nao gerou imagem | Verificar logs, modelo, API key |
| `INTERNAL_ERROR` | Excecao generica | Verificar logs da Edge Function |

### 2. Consultar logs da Edge Function

No Supabase Dashboard → Edge Functions → Logs, filtrar por:
- **Post Gen:** prefixo `[post-gen.*]`

Log tags importantes:
- `[post-gen.request]` — dados da request (formato, celebrity, tamanho)
- `[post-gen.generation-failed]` — Gemini falhou
- `[post-gen.output-upload-error]` — falha ao salvar output no bucket
- `[post-gen.complete]` — sucesso com duration_ms
- `[post-gen.error]` — excecao generica

### 3. Verificar config NanoBanana

```sql
SELECT gemini_model_name, gemini_api_base_url, max_retries,
       LENGTH(direction_moderna) AS dir_moderna_len,
       LENGTH(direction_clean) AS dir_clean_len,
       LENGTH(direction_retail) AS dir_retail_len
FROM nanobanana_config
LIMIT 1;
```

Se `gemini_model_name` estiver errado ou `gemini_api_base_url` invalido, todas as geracoes falham.

## Reprocessar Jobs Falhados

Nao ha retry automatico. Para reprocessar, o usuario precisa submeter novamente pelo frontend.

**Workaround manual (se necessario resetar um job para reprocessamento futuro):**

```sql
-- NAO faz a geracao — apenas reseta o status para debug
UPDATE garden_jobs
SET status = 'pending',
    error_code = NULL,
    error_message = NULL,
    duration_ms = NULL
WHERE id = '<job_id>'
  AND status = 'failed';
```

⚠️ **Atencao:** Isso NAO dispara a geracao. Apenas limpa o status. A geracao so acontece via Edge Function.

## Manutencao do Bucket

### Verificar tamanho do bucket

O bucket `aurea-garden-assets` acumula assets indefinidamente. Para verificar:

```sql
-- Contar jobs por tool
SELECT tool, status, COUNT(*) FROM garden_jobs GROUP BY tool, status ORDER BY tool;
```

### Limpeza de assets de jobs falhados (se necessario)

Assets de jobs falhados ocupam espaco sem utilidade. Para listar paths de jobs falhados:

```sql
SELECT id, tool, source_image_path
FROM garden_jobs
WHERE status = 'failed'
  AND source_image_path IS NOT NULL
ORDER BY created_at ASC;
```

⚠️ Remocao de assets deve ser feita via Supabase Storage API/Dashboard, NAO via SQL.

## Alteracao de Config NanoBanana

### Via dashboard

Acessar `/ai-step2/nanobanana-config` no painel AI-Step2.

### Via SQL direto (emergencia)

```sql
-- Exemplo: trocar modelo
UPDATE nanobanana_config
SET gemini_model_name = 'gemini-2.0-flash-exp'
WHERE id = (SELECT id FROM nanobanana_config LIMIT 1);

-- Exemplo: atualizar direction
UPDATE nanobanana_config
SET direction_moderna = 'Novo texto criativo aqui...'
WHERE id = (SELECT id FROM nanobanana_config LIMIT 1);
```

## Deploy de Edge Functions Garden

Todas as funcoes Garden sao **publicas** (sem JWT):

```bash
# Post Gen
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt

# Listagem
supabase functions deploy list-garden-jobs --project-ref awqtzoefutnfmnbomujt --no-verify-jwt

# Opcoes
supabase functions deploy get-garden-options --project-ref awqtzoefutnfmnbomujt --no-verify-jwt

# Job individual (polling)
supabase functions deploy get-garden-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Sempre confirmar que o CLI retornou `Deployed Functions on project`.
