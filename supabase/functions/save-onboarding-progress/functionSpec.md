# functionSpec: save-onboarding-progress

## Objetivo

Persiste o progresso do onboarding publico por `compra_id` e registra aceites auditaveis dos checkboxes exibidos ao cliente.

## Entradas

### Autenticacao
- Publica no gateway.
- Deploy: `--no-verify-jwt`.
- Segurança: validação de `compra_id` UUID não-adivinhável.

### Variaveis de Ambiente
| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role para escrever em `onboarding_progress` e `onboarding_acceptances` |

### Requisicao
- Metodo: `POST`
- Content-Type: `application/json`

### Body
| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `compra_id` | uuid | Sim | UUID valido, FK de `compras.id` |
| `step` | string | Sim | `1`..`7` ou `final` |
| `current_step` | string | Sim | Proximo passo atual do wizard |
| `traffic_choice` | string | Nao | `yes` ou `no` |
| `acceptances` | array | Nao | Max 12 itens; permitido apenas nas etapas 2, 3, 4 e 6 |

### `acceptances[]`
| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `item_key` | string | Sim | Deve estar na allowlist da etapa |
| `item_text` | string | Sim | Texto final exibido ao cliente, 1-2000 chars |
| `accepted` | boolean | Nao | Default `true` |
| `copy_source` | string | Nao | `copy.js` ou `onboarding_copy:<version>`, max 80 chars |
| `metadata` | object | Nao | JSON object, max 4000 bytes serializado |

## Comportamento

1. Valida metodo, `compra_id`, `step`, `current_step`, `traffic_choice` e `acceptances`.
2. Faz upsert em `onboarding_progress` por `compra_id`, preservando timestamps já existentes.
3. Se houver `acceptances`, calcula `item_hash = sha256(item_key + "\n" + item_text)`.
4. Faz upsert idempotente em `onboarding_acceptances` por `(compra_id, item_key, item_hash)`.
5. Retorna sucesso com `acceptances_count`.

## Resposta

```json
{
  "success": true,
  "data": {
    "acceptances_count": 3
  }
}
```

## Erros

| HTTP | Codigo | Descricao |
|------|--------|-----------|
| 400 | `INVALID_COMPRA_ID` | `compra_id` ausente ou invalido |
| 400 | `INVALID_STEP` | Etapa fora da allowlist |
| 400 | `INVALID_TRAFFIC_CHOICE` | Valor diferente de `yes` ou `no` |
| 400 | `ITEM_KEY_NOT_ALLOWED` | Aceite não permitido para a etapa |
| 404 | `COMPRA_NOT_FOUND` | FK para `compras` inexistente |
| 500 | `DB_ERROR` | Falha ao salvar progresso |
| 500 | `ACCEPTANCES_DB_ERROR` | Falha ao salvar aceites |

## Dependencias

- `onboarding_progress` — estado atual e timestamps por etapa.
- `onboarding_acceptances` — snapshot auditavel dos checkboxes aceitos.

## Deploy

```bash
supabase functions deploy save-onboarding-progress --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
