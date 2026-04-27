# functionSpec: save-onboarding-identity

## Objetivo

Persiste a identidade visual enviada na Etapa 6.2 do onboarding publico, registra histórico de submissões e histórico de logo, e dispara o enrichment quando há site ou Instagram.

## Entradas

### Autenticacao
- Publica no gateway.
- Deploy: `--no-verify-jwt`.
- Segurança: validação de `compra_id` UUID não-adivinhável.

### Variaveis de Ambiente
| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role para DB, Storage e chamada interna ao enrichment |

### Requisicao
- Metodo: `POST`
- Content-Type: `multipart/form-data` ou `application/json`

### Campos
| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `compra_id` | uuid | Sim | UUID valido |
| `choice` | string | Sim | `add_now` ou `later` |
| `logo` | file | Nao | PNG, JPG, SVG, WebP, HEIC, HEIF ou PDF; max 5 MB |
| `site_url` | string | Nao | Max 500 chars; deve iniciar com `http://` ou `https://` |
| `instagram_handle` | string | Nao | Letras, numeros, `.`, `_`, max 30 chars; sem `@` |
| `brand_palette` | array/json string | Nao | Max 8 cores |
| `campaign_notes` | string | Nao | Max 2000 chars |
| `font_choice` | string | Nao | Max 100 chars |
| `production_path` | string | Nao | `standard` ou `hybrid`; backend força `standard` se houver site/Instagram |

## Comportamento

1. Valida metodo, content type e campos.
2. Se houver logo, grava no bucket privado `onboarding-identity` em `{compra_id}/logos/{uuid}.{ext}`.
3. Para logo publico, desativa logo ativo anterior e insere novo registro em `onboarding_logo_history` com `source = public_onboarding`.
4. Faz upsert em `onboarding_identity` por `compra_id`.
5. Insere evento imutavel em `onboarding_identity_submissions`, inclusive para `choice = later`.
6. Se `site_url` ou `instagram_handle` estiverem preenchidos, chama `onboarding-enrichment` com bearer service role.
7. Retorna ids de identidade, submissão e histórico de logo quando aplicavel.

## Resposta

```json
{
  "success": true,
  "data": {
    "identity_id": "uuid",
    "submission_id": "uuid",
    "logo_history_id": "uuid",
    "logo_path": "compra/logos/arquivo.png",
    "campaign_images_count": 0
  }
}
```

## Erros

| HTTP | Codigo | Descricao |
|------|--------|-----------|
| 400 | `INVALID_COMPRA_ID` | `compra_id` ausente ou invalido |
| 400 | `INVALID_CHOICE` | `choice` fora de `add_now/later` |
| 400 | `LOGO_TOO_LARGE` | Logo acima de 5 MB |
| 400 | `INVALID_LOGO_TYPE` | Formato de logo não aceito |
| 400 | `INVALID_URL` | `site_url` sem protocolo |
| 400 | `INVALID_HANDLE` | Instagram inválido |
| 500 | `UPLOAD_ERROR` | Falha no Storage |
| 500 | `LOGO_HISTORY_ERROR` | Falha ao registrar histórico de logo |
| 500 | `DB_ERROR` | Falha no upsert de identidade |
| 500 | `SUBMISSION_AUDIT_ERROR` | Falha ao registrar submissão |

## Dependencias

- `onboarding_identity` — estado atual da identidade por compra.
- `onboarding_identity_submissions` — histórico imutável de submissões.
- `onboarding_logo_history` — histórico e logo ativo.
- Storage `onboarding-identity` — arquivos privados do cliente.
- `onboarding-enrichment` — pipeline assíncrono quando há site/Instagram.

## Deploy

```bash
supabase functions deploy save-onboarding-identity --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
