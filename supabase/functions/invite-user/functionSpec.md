# invite-user

Envia convite Supabase Auth e atribui profile/role inicial.

## Auth
- JWT obrigatorio.
- Apenas `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/invite-user`

```json
{ "email": "user@example.com", "full_name": "Nome", "role": "viewer" }
```

`role` aceita `admin`, `operator`, `viewer`; default `viewer`.

## Regras
- Usa `serviceClient.auth.admin.inviteUserByEmail`.
- `redirectTo` usa `DASHBOARD_URL`, `SITE_URL` ou `Origin` + `/reset-password?type=invite`.
- Upsert em `profiles` com `status='active'`.
- Upsert em `user_roles` com `assigned_by` e `assigned_at`.

## Erros
- 400 `INVALID_JSON | INVALID_EMAIL | INVALID_NAME`
- 401/403 auth/RBAC
- 500 `INVITE_FAILED | PROFILE_UPSERT_FAILED | ROLE_UPSERT_FAILED`

## Deploy
`supabase functions deploy invite-user --project-ref awqtzoefutnfmnbomujt`
