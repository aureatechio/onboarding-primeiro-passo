# record-dashboard-activity

Registra login e ultima atividade especificos do dashboard interno.

## Auth

- JWT obrigatorio (`Authorization: Bearer <access_token>`).
- Guard: `requireRole(req, ["admin", "operator", "viewer"])`.
- Deploy sem `--no-verify-jwt`.
- A funcao nunca aceita `user_id` do frontend; usa `authResult.user.id`.

## Request

`POST /functions/v1/record-dashboard-activity`

```json
{
  "event": "login",
  "path": "/ai-step2/monitor"
}
```

Eventos:

- `login`: login bem-sucedido neste app; atualiza `last_login_at`,
  `last_seen_at` e incrementa `login_count`.
- `activity`: atividade autenticada no dashboard; atualiza `last_seen_at`.

## Response

200:

```json
{
  "success": true,
  "activity": {
    "user_id": "uuid",
    "last_login_at": "timestamp",
    "last_seen_at": "timestamp",
    "login_count": 1,
    "last_seen_path": "/users",
    "updated_at": "timestamp"
  }
}
```

## Tabela

Escreve em `public.dashboard_user_activity`, objeto proprio deste app.

## Erros

- 400 `INVALID_JSON | INVALID_EVENT | INVALID_PATH`
- 401 `UNAUTHORIZED | INVALID_JWT`
- 403 `FORBIDDEN`
- 405 `METHOD_NOT_ALLOWED`
- 500 `DB_READ_ERROR | DB_WRITE_ERROR`

## Deploy

```bash
supabase functions deploy record-dashboard-activity --project-ref awqtzoefutnfmnbomujt
```
