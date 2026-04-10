# functionSpec: get-nanobanana-config

## Goal

Retorna a configuração singleton do NanoBanana (geração de criativos com Gemini), incluindo signed URLs temporárias para imagens de referência.

## Inputs

### Auth
- **Pública** — sem autenticação. Deploy com `--no-verify-jwt`.

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |

### Request
- Método: `GET`
- Sem body
- Sem query params

## Validations

- Método ≠ GET → 405 `METHOD_NOT_ALLOWED`

## Behavior

1. Cria cliente Supabase com service role key
2. Busca row única de `nanobanana_config` via `.limit(1).single()`
3. Gera signed URLs (TTL 30 min) para cada imagem de referência existente:
   - `direction_moderna_image_path` → `direction_moderna_image_url`
   - `direction_clean_image_path` → `direction_clean_image_url`
   - `direction_retail_image_path` → `direction_retail_image_url`
4. Retorna config completa com defaults para campos nulos

### Defaults (quando campo é null no banco)

| Campo | Default |
|-------|---------|
| `gemini_model_name` | `gemini-2.0-flash-exp` |
| `gemini_api_base_url` | `https://generativelanguage.googleapis.com` |
| `max_retries` | `3` |
| `worker_batch_size` | `4` |
| `url_expiry_seconds` | `86400` |
| `max_image_download_bytes` | `10485760` (10 MB) |
| `global_rules` | `""` |
| `global_rules_version` | `1.0.0` |
| `prompt_version` | `1.0.0` |
| `direction_*` | `""` |
| `direction_*_mode` | `text` |
| `direction_*_image_path` | `null` |
| `format_*` | `""` |
| `temperature` | `1.0` |
| `top_p` | `0.95` |
| `top_k` | `40` |
| `safety_preset` | `default` |
| `use_system_instruction` | `false` |

## Response (200)

```json
{
  "success": true,
  "config": {
    "gemini_model_name": "gemini-2.0-flash-exp",
    "gemini_api_base_url": "https://generativelanguage.googleapis.com",
    "max_retries": 3,
    "worker_batch_size": 4,
    "url_expiry_seconds": 86400,
    "max_image_download_bytes": 10485760,
    "global_rules": "...",
    "global_rules_version": "1.0.0",
    "prompt_version": "1.0.0",
    "direction_moderna": "...",
    "direction_clean": "...",
    "direction_retail": "...",
    "direction_moderna_mode": "text",
    "direction_clean_mode": "text",
    "direction_retail_mode": "text",
    "direction_moderna_image_path": null,
    "direction_clean_image_path": null,
    "direction_retail_image_path": null,
    "direction_moderna_image_url": null,
    "direction_clean_image_url": null,
    "direction_retail_image_url": null,
    "format_1_1": "...",
    "format_4_5": "...",
    "format_16_9": "...",
    "format_9_16": "...",
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 40,
    "safety_preset": "default",
    "use_system_instruction": false,
    "updated_at": "2026-04-06T12:00:00.000Z"
  }
}
```

## External Dependencies

- **Supabase DB**: tabela `nanobanana_config` (singleton, 1 row)
- **Supabase Storage**: bucket `nanobanana-references` (signed URLs)

## Shared Module

- Importa `REFERENCE_BUCKET`, `CONFIG_TABLE` de `_shared/nanobanana/config.ts`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 405 | `METHOD_NOT_ALLOWED` | Método ≠ GET |
| 500 | — | Erro ao buscar config no banco |
| 500 | — | Erro interno não tratado |

## CORS

- Suporta `OPTIONS` (preflight) com headers: `authorization, x-client-info, apikey, content-type`
- Métodos permitidos: `GET, OPTIONS`

## Observability

- `console.error` com prefix `[get-nanobanana-config]` em cenários de erro
- Erros de banco incluem campo `details` com mensagem do Supabase

## Notes

- **Signed URL TTL vs config `url_expiry_seconds`:** A signed URL do GET usa TTL fixo de 30 min (para preview no frontend). O campo `url_expiry_seconds` da config (default 24h) é usado pelos workers de geração de imagem — são contextos diferentes.

- Signed URLs expiram em 30 minutos; frontend deve refrescar periodicamente
- Se não existir config no banco, retorna defaults hardcoded (não falha)
- É a única function NanoBanana que deve permanecer pública
