# list-users

Lista usuarios do dashboard para admins.

## Auth
- JWT obrigatorio (`Authorization: Bearer <access_token>`).
- `requireAdmin(req)`; retorna 401 sem JWT/invalido e 403 sem role `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`GET /functions/v1/list-users?search=&role=&status=&page=1&limit=20`

Filtros opcionais:
- `search`: nome ou email.
- `role`: `admin | operator | viewer`.
- `status`: `active | disabled`.

## Response
200 `{ success, users, pagination }`.

Cada usuario retorna `id`, `email`, `full_name`, `avatar_url`, `role`, `status`, `assigned_by`, `assigned_at`, `created_at`, `updated_at`, `last_sign_in_at`.

## Erros
- 400 `INVALID_ROLE | INVALID_STATUS`
- 401 `UNAUTHORIZED | INVALID_JWT`
- 403 `FORBIDDEN`
- 500 `AUTH_ERROR | DB_ERROR`

## Deploy
`supabase functions deploy list-users --project-ref awqtzoefutnfmnbomujt`
