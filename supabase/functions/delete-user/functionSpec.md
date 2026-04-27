# delete-user

Remove o acesso de um usuario a este app sem excluir a conta em `auth.users`.

## Auth
- JWT obrigatorio.
- Apenas `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/delete-user`

```json
{ "user_id": "uuid" }
```

## Regras
- Bloqueia auto-delete (`SELF_DELETE`).
- Bloqueia excluir o unico admin (`LAST_ADMIN`).
- Nao chama `serviceClient.auth.admin.deleteUser`.
- Remove registros do app em `dashboard_user_activity`, `user_roles` e `profiles`.
- A conta em `auth.users` permanece disponivel para outros apps/modulos do Supabase compartilhado.
- Usuarios sem `profiles` + `user_roles` nao aparecem em `list-users` e nao recebem acesso no dashboard.

## Erros
- 400 `INVALID_JSON | INVALID_USER_ID`
- 401/403 auth/RBAC
- 409 `SELF_DELETE | LAST_ADMIN`
- 500 `LOCKOUT_CHECK_FAILED | ACTIVITY_DELETE_FAILED | ROLE_DELETE_FAILED | PROFILE_DELETE_FAILED`

## Deploy
`supabase functions deploy delete-user --project-ref awqtzoefutnfmnbomujt`
