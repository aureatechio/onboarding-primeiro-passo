# functionSpec: list-garden-jobs

## Goal

Listar jobs da Aurea Garden com filtros por ferramenta e status, paginacao e regeneracao de signed URLs.

## HTTP

- **Method:** GET
- **Auth:** Publica (deploy com `--no-verify-jwt`)

## Inputs (Query Parameters)

| Param | Default | Valid Values |
|-------|---------|-------------|
| `tool` | `all` | `all`, `post-turbo`, `post-gen` |
| `status` | `completed` | `all`, `pending`, `processing`, `completed`, `failed` |
| `page` | `1` | Inteiro >= 1 |
| `limit` | `20` | Inteiro 1-50 |

## Behavior

1. Valida `tool` e `status` contra valores permitidos.
2. Consulta `garden_jobs` com filtros, ordenado por `created_at DESC`.
3. Paginacao via `range()` do Supabase (offset-based).
4. Para cada job `completed` com `output_image_path`: regenera signed URL (7 dias).
5. Retorna items com metadados + total + page + limit.

## Response Shape

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "job_id": "uuid",
        "tool": "post-gen",
        "status": "completed",
        "input_prompt": "...",
        "input_format": "1:1",
        "input_metadata": { ... },
        "output_image_url": "https://...signed-url...",
        "duration_ms": 12345,
        "error_code": null,
        "error_message": null,
        "created_at": "2026-04-05T..."
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

## Error Handling

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `INVALID_INPUT` | tool ou status invalido |
| 500 | `INTERNAL_ERROR` | Erro de query ou excecao |

## Deploy

```bash
supabase functions deploy list-garden-jobs --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
