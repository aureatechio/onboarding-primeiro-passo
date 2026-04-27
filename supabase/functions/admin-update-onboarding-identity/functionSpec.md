# admin-update-onboarding-identity

Atualiza campos editaveis de `onboarding_identity` a partir do painel admin (Monitor).

## Auth
- JWT obrigatorio (`Authorization: Bearer <access_token>`) — `requireAuth` rejeita 401 sem token ou token invalido.
- Rejeita `service_role`.
- Deploy: **sem** `--no-verify-jwt`.

## Request
`POST /functions/v1/admin-update-onboarding-identity`

```json
{
  "compra_id": "uuid",
  "changes": {
    "brand_display_name": "string | null",
    "font_choice": "string | null",
    "instagram_handle": "string | null",
    "site_url": "string | null",
    "campaign_notes": "string | null",
    "brand_palette": ["#rrggbb", "..."] 
  },
  "reenrich": false
}
```

Apenas campos presentes em `changes` sao atualizados. Valor `null` ou string vazia apaga o campo (exceto `brand_display_name`, que retorna 400 quando vazio via validator, mas aceita `null` explicito para limpar).

## Validacao
Reusa `_shared/onboarding-validation.ts`:
- `validateUuid(compra_id)`
- `validateBrandDisplayName` (max 120 chars)
- `validateFontChoice` (max 100 chars)
- `validateInstagramHandle` (sem @, regex `^[a-zA-Z0-9._]{1,30}$`)
- `validateSiteUrl` (http/https, max 500)
- `validateCampaignNotes` (max 2000)
- `validateBrandPalette` (array max 8 hex `#RRGGBB`)

## Regras de negocio
- UPDATE parcial em `onboarding_identity` WHERE `compra_id = :compra_id`.
- Se `reenrich: true` e `site_url` ou `instagram_handle` foram alterados, dispara POST para `onboarding-enrichment` com `{ compra_id }` (service_role).
- Retorna a row atualizada + `reenrich_triggered: boolean`.
- Se nao houver `onboarding_identity` para o `compra_id`, retorna 404.

## Respostas
- 200: `{ success, identity, reenrich_triggered, updated_by }`
- 400: `INVALID_UUID` | `INVALID_JSON` | `NO_CHANGES` | validacoes por campo (`BRAND_NAME_EMPTY`, `BRAND_NAME_TOO_LONG`, `FONT_TOO_LONG`, `INVALID_HANDLE`, `URL_TOO_LONG`, `INVALID_URL`, `NOTES_TOO_LONG`, `INVALID_PALETTE`, `TOO_MANY_COLORS`, `INVALID_COLOR`)
- 401: sem JWT / JWT invalido
- 404: `NOT_FOUND`
- 500: `DB_ERROR` | `CONFIG_ERROR`

## Deploy
```
supabase functions deploy admin-update-onboarding-identity --project-ref awqtzoefutnfmnbomujt
```
