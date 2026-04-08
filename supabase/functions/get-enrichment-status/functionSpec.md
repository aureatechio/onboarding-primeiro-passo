# functionSpec: get-enrichment-status

## Objetivo

Endpoint de leitura do status do job de enriquecimento para uma compra. Usado pelo frontend para polling do progresso do pipeline.

---

## Entradas

### Autenticacao

- Publica (`--no-verify-jwt`)

### Requisicao

- Metodo: GET
- Query param: `compra_id` (UUID)

---

## Validacoes

1. Metodo != GET → 405 `METHOD_NOT_ALLOWED`
2. `compra_id` ausente ou invalido → 400 `INVALID_COMPRA_ID`
3. Job nao encontrado → 404 `NOT_FOUND`

---

## Comportamento

1. Validar `compra_id` (UUID regex)
2. SELECT `*` em `onboarding_enrichment_jobs` WHERE `compra_id`
3. Se nao encontrado → 404
4. Retornar todos os campos do job

---

## Resposta (200)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "compra_id": "uuid",
    "status": "processing",
    "phase_colors_status": "completed",
    "phase_font_status": "completed",
    "phase_briefing_status": "processing",
    "phase_campaign_status": "pending",
    "extracted_palette": ["#384ffe", "#1a1a2e"],
    "extracted_palette_source": "logo_algorithm",
    "detected_font": "Montserrat",
    "detected_font_source": "site_css",
    "font_validated": true,
    "font_validation_reason": "Fonte adequada para material publicitario",
    "briefing_generated": false,
    "campaign_job_id": null,
    "error_phase": null,
    "error_message": null,
    "phases_log": [],
    "created_at": "2026-04-08T15:30:00Z",
    "updated_at": "2026-04-08T15:30:06Z"
  }
}
```

---

## Deploy

```bash
supabase functions deploy get-enrichment-status --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
