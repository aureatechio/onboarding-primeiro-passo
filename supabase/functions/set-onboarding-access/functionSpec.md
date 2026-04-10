# set-onboarding-access — Function Spec

## Objetivo

Liberar, bloquear ou revogar o acesso ao onboarding para uma compra, com rastreabilidade completa via `onboarding_access` e `onboarding_access_events`.

## Autenticacao

Guard admin via header `x-admin-password` (`requireAdminPassword`).

## Metodo

`POST`

## Body (JSON)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `compra_id` | uuid | sim | ID da compra alvo |
| `action` | string | sim | `allow`, `revoke`, `block` |
| `reason_code` | string | sim | `negotiated_payment_terms`, `manual_exception`, `revoked_by_admin`, `other` |
| `notes` | string | nao | Observacao livre (max 1000 chars) |
| `allowed_until` | ISO datetime | nao | Validade da liberacao (somente para `allow`) |
| `actor_id` | string | nao | Identificador do responsavel (default: `admin`) |

## Comportamento

1. Valida input (compra_id, action, reason_code).
2. Verifica se compra existe.
3. Faz UPSERT em `onboarding_access` (onConflict: `compra_id`).
4. Trigger `trg_onboarding_access_audit` grava evento imutavel em `onboarding_access_events`.
5. Retorna estado atualizado.

## Resposta (sucesso)

```json
{
  "success": true,
  "access": {
    "id": "uuid",
    "compra_id": "uuid",
    "status": "allowed",
    "reason_code": "negotiated_payment_terms",
    "notes": "Negociacao aprovada pelo comercial",
    "allowed_until": null,
    "updated_at": "2026-04-10T..."
  },
  "message": "Onboarding allowed para compra ..."
}
```

## Erros

| Code | HTTP | Descricao |
|------|------|-----------|
| `INVALID_COMPRA_ID` | 400 | compra_id ausente ou invalido |
| `INVALID_ACTION` | 400 | action invalida |
| `INVALID_REASON` | 400 | reason_code invalido |
| `INVALID_DATE` | 400 | allowed_until invalido |
| `COMPRA_NOT_FOUND` | 404 | Compra nao encontrada |
| `DB_ERROR` | 500 | Erro de persistencia |
| `UNAUTHORIZED` | 401 | Senha admin invalida |

## Deploy

```bash
supabase functions deploy set-onboarding-access --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
