# delete-user

Exclui usuario do Supabase Auth.

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
- Remove via `serviceClient.auth.admin.deleteUser`; cascades limpam `profiles` e `user_roles`.

## Erros
- 400 `INVALID_JSON | INVALID_USER_ID`
- 401/403 auth/RBAC
- 409 `SELF_DELETE | LAST_ADMIN`
- 500 `LOCKOUT_CHECK_FAILED | DELETE_FAILED`

## Deploy
`supabase functions deploy delete-user --project-ref awqtzoefutnfmnbomujt`
