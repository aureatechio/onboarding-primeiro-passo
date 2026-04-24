# functionSpec: update-enrichment-config

## Objetivo

Atualiza campos da configuracao do pipeline de enriquecimento. Tabela singleton `enrichment_config`. Protegida via JWT + RBAC admin.

---

## Entradas

### Autenticacao

- Header `Authorization: Bearer <access_token>` com role `admin`
- Deploy protegido: nao usar `--no-verify-jwt`

### Requisicao

- Metodo: POST
- Content-Type: application/json

### Campos (Body)

Todos os campos sao opcionais. Apenas os campos presentes no body serao atualizados.

| Campo | Tipo | Validacao |
|-------|------|-----------|
| `color_gemini_prompt` | string | Nao vazio |
| `color_fallback_palette` | string[] | Array nao-vazio de hex colors (#RRGGBB) |
| `color_extraction_max` | integer | 1-10 |
| `font_validation_prompt` | string | Nao vazio |
| `font_suggestion_prompt` | string | Nao vazio |
| `font_fallback` | string | Nao vazio |
| `briefing_auto_mode` | string | `text`, `audio` ou `both` |
| `gemini_model_name` | string | Nao vazio |
| `gemini_api_base_url` | string | Comeca com `https://` |
| `gemini_temperature` | number | 0-2 |
| `timeout_colors_ms` | integer | 1000-120000 |
| `timeout_font_ms` | integer | 1000-120000 |
| `timeout_briefing_ms` | integer | 1000-120000 |
| `timeout_campaign_ms` | integer | 1000-120000 |
| `retry_gemini_max` | integer | 0-10 |
| `retry_gemini_backoff_ms` | string | Lista de inteiros separados por virgula |
| `retry_scrape_max` | integer | 0-10 |
| `retry_scrape_backoff_ms` | string | Lista de inteiros separados por virgula |
| `scrape_timeout_ms` | integer | 1000-30000 |
| `scrape_user_agent` | string | Nao vazio |

---

## Validacoes

1. Metodo != POST → 405 `METHOD_NOT_ALLOWED`
2. JWT ausente/invalido → 401 `UNAUTHORIZED`; role sem admin → 403 `FORBIDDEN`
3. JSON invalido → 400 `INVALID_JSON`
4. Nenhum campo valido no body → 400 `NO_VALID_FIELDS`
5. Campo com valor invalido → 400 `VALIDATION_ERROR`

---

## Comportamento

1. Validar JWT + role admin via `requireRole()`
2. Parsear body JSON
3. Validar cada campo presente (tipos, ranges)
4. Buscar registro existente (singleton)
5. UPDATE no registro + `updated_at`
6. Limpar cache in-memory via `resetConfigCache()`
7. Retornar config atualizada

---

## Resposta (200)

```json
{
  "success": true,
  "config": {
    "id": "uuid",
    "color_gemini_prompt": "...",
    "...": "todos os campos atualizados"
  }
}
```

---

## Deploy

```bash
supabase functions deploy update-enrichment-config --project-ref awqtzoefutnfmnbomujt
```
