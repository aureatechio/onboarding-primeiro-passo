# Contrato Tecnico - Aba Testes Perplexity

## Objetivo

Padronizar o contrato da aba `Testes` do monitor de Perplexity para execucao audivel e rastreavel no backend.

## Politica de campos faltantes

- A compra elegivel fornece o contexto base (`compra_id`) e prefill de onboarding quando disponivel.
- Campos obrigatorios para execucao:
  - `compra_id` (UUID valido)
  - `company_name` (2-120 chars)
  - `company_site` (URL `http/https`)
  - `celebrity_name` (2-120 chars)
- Campos opcionais (podem ser preenchidos manualmente se ausentes na compra):
  - `context.segment`
  - `context.region`
  - `context.campaign_goal_hint` (`awareness|conversao|retencao`)
  - `briefing_input.text` (obrigatorio apenas quando `mode` = `text` ou `both`)

## Endpoint de teste

### `POST /functions/v1/test-perplexity-briefing`

Request:

```json
{
  "compra_id": "uuid",
  "company_name": "Empresa",
  "company_site": "https://empresa.com.br",
  "celebrity_name": "Celebridade",
  "context": {
    "segment": "Moda",
    "region": "Sudeste",
    "campaign_goal_hint": "awareness"
  },
  "briefing_input": {
    "mode": "text",
    "text": "Briefing informado pelo operador"
  }
}
```

Success (`200`):

```json
{
  "success": true,
  "run_id": "uuid",
  "duration_ms": 1234,
  "data": {
    "compra_id": "uuid",
    "provider": "perplexity",
    "model": "sonar",
    "contract_version": "v1.0.0",
    "prompt_version": "v1.0.0",
    "strategy_version": "v1.0.0",
    "briefing": {},
    "insights_pecas": [],
    "citacoes": [],
    "raw": {}
  }
}
```

Erro:

- `400 INVALID_INPUT`
- `502 PERPLEXITY_PROVIDER_ERROR`
- `504 PERPLEXITY_TIMEOUT`
- `502 INVALID_PROVIDER_RESPONSE`
- `500 INTERNAL_ERROR`

## Endpoint de historico

### `GET /functions/v1/test-perplexity-briefing?compra_id=<uuid>&limit=10`

Success (`200`):

```json
{
  "success": true,
  "runs": [
    {
      "id": "uuid",
      "compra_id": "uuid",
      "status": "done",
      "error_code": null,
      "provider_model": "sonar",
      "prompt_version": "v1.0.0",
      "strategy_version": "v1.0.0",
      "contract_version": "v1.0.0",
      "duration_ms": 1200,
      "created_at": "2026-03-31T12:00:00Z"
    }
  ]
}
```
