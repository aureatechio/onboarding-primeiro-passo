# admin-upload-logo

Sobe um novo logo para uma compra, registra em `onboarding_logo_history` como ativo e aponta `onboarding_identity.logo_path` para o novo arquivo.

## Auth
- JWT obrigatorio (`requireAuth`). Deploy sem `--no-verify-jwt`.

## Request
`POST /functions/v1/admin-upload-logo` — `multipart/form-data`:
- `compra_id`: uuid
- `file`: arquivo de logo (PNG/JPG/WebP/SVG/PDF/HEIC/HEIF, max 5 MB)

## Validacao
- `validateUuid(compra_id)`
- `validateLogoFile(file)` (mime + tamanho)
- `getFileExtension(file)` para inferir extensao

## Regras
- Storage path: `{compra_id}/logos/{uuid}.{ext}` no bucket `onboarding-identity`.
- Zera `is_active` dos registros atuais da mesma compra antes de inserir o novo (libera o unique index parcial `onboarding_logo_history_one_active_per_compra`).
- Insere nova linha em `onboarding_logo_history` com `is_active=true`, `uploaded_by_user_id = auth.user.id` e `source='admin'`.
- Atualiza `onboarding_identity.logo_path` para o novo path.
- Em erro apos upload, tenta remover o arquivo do storage (best-effort).

## Respostas
- 200: `{ success, history_entry: { id, logo_path, logo_url (signed, 7d), ... } }`
- 400: `INVALID_UUID` | `INVALID_CONTENT_TYPE` | `INVALID_FORM` | `FILE_REQUIRED` | `LOGO_TOO_LARGE` | `INVALID_LOGO_TYPE`
- 401: JWT invalido/ausente
- 500: `STORAGE_ERROR` | `DB_ERROR` | `IDENTITY_UPDATE_FAILED`

## Deploy
```
supabase functions deploy admin-upload-logo --project-ref awqtzoefutnfmnbomujt
```
