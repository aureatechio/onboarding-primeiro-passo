# admin-set-active-logo

Marca um registro de `onboarding_logo_history` como ativo e sincroniza `onboarding_identity.logo_path`.

## Auth
- JWT obrigatorio (`requireAuth`). Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/admin-set-active-logo`
```json
{ "compra_id": "uuid", "logo_history_id": "uuid" }
```

## Regras
- Valida que `logo_history_id` pertence a `compra_id` (senao 404).
- Se ja esta ativo, retorna 200 com `already_active: true` (idempotente).
- Zera `is_active=true` de todos os outros da mesma compra **antes** de ativar o alvo (respeita unique index parcial).
- Atualiza `onboarding_identity.logo_path` para o path do alvo.

## Respostas
- 200: `{ success, logo_path, already_active? }`
- 400: `INVALID_UUID` | `INVALID_JSON`
- 401: JWT invalido
- 404: `NOT_FOUND`
- 500: `DB_ERROR` | `IDENTITY_UPDATE_FAILED`

## Deploy
```
supabase functions deploy admin-set-active-logo --project-ref awqtzoefutnfmnbomujt
```
