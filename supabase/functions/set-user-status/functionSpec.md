# set-user-status

Ativa ou desativa usuario.

## Auth
- JWT obrigatorio.
- Apenas `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/set-user-status`

```json
{ "user_id": "uuid", "status": "disabled" }
```

## Regras
- Status validos: `active`, `disabled`.
- `disabled` atualiza `profiles.status` e aplica `ban_duration='876000h'`.
- `active` atualiza `profiles.status` e aplica `ban_duration='none'`.
- Bloqueia desativar o unico admin.

## Erros
- 400 `INVALID_JSON | INVALID_USER_ID | INVALID_STATUS`
- 401/403 auth/RBAC
- 409 `LAST_ADMIN`
- 500 `LOCKOUT_CHECK_FAILED | AUTH_UPDATE_FAILED | DB_ERROR`

## Deploy
`supabase functions deploy set-user-status --project-ref awqtzoefutnfmnbomujt`
