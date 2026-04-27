# resend-user-invite

Reenvia convite Supabase Auth para usuarios convidados que ainda nao aceitaram o convite.

## Auth
- JWT obrigatorio.
- Apenas `admin`.
- Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/resend-user-invite`

```json
{ "user_id": "uuid" }
```

## Regras
- Usa `requireAdmin(req)`.
- Busca o usuario em Supabase Auth por `user_id`.
- So permite reenviar quando `auth.users.invited_at` existe e o usuario ainda nao tem `email_confirmed_at`, `confirmed_at` ou `last_sign_in_at`.
- Bloqueia usuario com `profiles.status = disabled`.
- Reenvia pelo Supabase Auth com `serviceClient.auth.admin.inviteUserByEmail`.
- `redirectTo` usa `DASHBOARD_URL`, `SITE_URL` ou `Origin` + `/reset-password?type=invite`.
- Nao altera role nem status.

## Response
200:

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "invited_at": "2026-04-27T00:00:00Z",
    "confirmation_sent_at": "2026-04-27T00:00:00Z"
  }
}
```

## Erros
- 400 `INVALID_JSON | INVALID_USER_ID`
- 401/403 auth/RBAC
- 404 `USER_NOT_FOUND`
- 409 `NO_EMAIL | USER_DISABLED | INVITE_ALREADY_ACCEPTED`
- 500 `AUTH_LOOKUP_FAILED | PROFILE_LOOKUP_FAILED | RESEND_INVITE_FAILED`

## Deploy
`supabase functions deploy resend-user-invite --project-ref awqtzoefutnfmnbomujt`
