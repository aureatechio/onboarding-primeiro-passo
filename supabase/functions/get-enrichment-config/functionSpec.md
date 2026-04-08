# functionSpec: get-enrichment-config

## Objetivo

Retorna a configuracao completa do pipeline de enriquecimento. Tabela singleton `enrichment_config`. Acesso publico (read-only).

---

## Entradas

### Autenticacao

- Publica (`--no-verify-jwt`)

### Requisicao

- Metodo: GET

---

## Validacoes

1. Metodo != GET → 405 `METHOD_NOT_ALLOWED`

---

## Comportamento

1. SELECT `*` da tabela `enrichment_config` (singleton — 1 registro)
2. Retornar todos os campos

---

## Resposta (200)

```json
{
  "success": true,
  "config": {
    "id": "uuid",
    "color_gemini_prompt": "...",
    "color_fallback_palette": ["#384ffe", "#1a1a2e", "#f5f5f5"],
    "color_extraction_max": 5,
    "font_validation_prompt": "...",
    "font_suggestion_prompt": "...",
    "font_fallback": "Inter",
    "briefing_auto_mode": "text",
    "gemini_model_name": "gemini-2.0-flash",
    "gemini_api_base_url": "https://generativelanguage.googleapis.com/v1beta",
    "gemini_temperature": 0.2,
    "timeout_colors_ms": 10000,
    "timeout_font_ms": 15000,
    "timeout_briefing_ms": 30000,
    "timeout_campaign_ms": 10000,
    "retry_gemini_max": 2,
    "retry_gemini_backoff_ms": "1000,3000",
    "retry_scrape_max": 1,
    "retry_scrape_backoff_ms": "2000",
    "scrape_timeout_ms": 5000,
    "scrape_user_agent": "AceleraiBot/1.0 (+https://acelerai.com)",
    "updated_at": "2026-04-08T12:00:00Z"
  }
}
```

---

## Deploy

```bash
supabase functions deploy get-enrichment-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
