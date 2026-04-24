# update-user-role

Atualiza role de um usuario.

## Auth
- JWT obrigatorio.
- Apenas `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/update-user-role`

```json
{ "user_id": "uuid", "role": "operator" }
```

## Regras
- Roles validas: `admin`, `operator`, `viewer`.
- Bloqueia rebaixar o unico admin (`LAST_ADMIN`).
- Registra `assigned_by` e `assigned_at`.

## Erros
- 400 `INVALID_JSON | INVALID_USER_ID | INVALID_ROLE`
- 401/403 auth/RBAC
- 409 `LAST_ADMIN`
- 500 `LOCKOUT_CHECK_FAILED | DB_ERROR`

## Deploy
`supabase functions deploy update-user-role --project-ref awqtzoefutnfmnbomujt`
