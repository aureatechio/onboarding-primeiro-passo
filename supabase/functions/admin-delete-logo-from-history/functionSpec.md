# admin-delete-logo-from-history

Remove permanente de um registro de `onboarding_logo_history` + arquivo do storage.

## Auth
- JWT obrigatorio (`requireAuth`). Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/admin-delete-logo-from-history`
```json
{ "compra_id": "uuid", "logo_history_id": "uuid" }
```
Aceita tambem `DELETE`.

## Regras
- 404 se o registro nao pertencer a `compra_id`.
- 409 `ACTIVE_LOGO_PROTECTED` se `is_active = true` (operador precisa ativar outro antes).
- Remove arquivo do storage (`onboarding-identity` bucket) — erros de storage nao abortam (best-effort).
- DELETE da linha.

## Respostas
- 200: `{ success, deleted_id }`
- 400: `INVALID_UUID` | `INVALID_JSON`
- 401: JWT invalido
- 404: `NOT_FOUND`
- 409: `ACTIVE_LOGO_PROTECTED`
- 500: `DB_ERROR`

## Deploy
```
supabase functions deploy admin-delete-logo-from-history --project-ref awqtzoefutnfmnbomujt
```
