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
200 `{ success, users, summary, pagination }`.

Lista apenas usuarios com acesso atual ao dashboard, ou seja, contas Auth que possuem registros em `profiles` e `user_roles`. Contas preservadas em `auth.users` apos remocao de acesso ao app nao aparecem nesta resposta.

Cada usuario retorna `id`, `email`, `full_name`, `avatar_url`, `role`, `status`, `assigned_by`, `assigned_at`, `created_at`, `updated_at`, `invited_at`, `confirmation_sent_at`, `confirmed_at`, `email_confirmed_at`, `invite_status`, `can_resend_invite`, `last_sign_in_at`, `auth_last_sign_in_at`, `app_last_login_at`, `app_last_seen_at`, `app_login_count`.

Observacao:
- `invite_status` pode ser `pending`, `accepted` ou `not_invited`.
- `can_resend_invite` so fica `true` para usuarios convidados, ainda nao confirmados e nao desativados.
- `last_sign_in_at` e `auth_last_sign_in_at` vem de `auth.users.last_sign_in_at` e representam login global no projeto Supabase Auth.
- `app_last_login_at` e `app_last_seen_at` vem de `dashboard_user_activity` e representam login/atividade neste dashboard.

`summary` retorna contadores totais da lista filtrada antes da paginacao:

- `total`
- `roles.admin | roles.operator | roles.viewer`
- `status.active | status.disabled`

## Erros
- 400 `INVALID_ROLE | INVALID_STATUS`
- 401 `UNAUTHORIZED | INVALID_JWT`
- 403 `FORBIDDEN`
- 500 `AUTH_ERROR | DB_ERROR`

## Deploy
`supabase functions deploy list-users --project-ref awqtzoefutnfmnbomujt`
