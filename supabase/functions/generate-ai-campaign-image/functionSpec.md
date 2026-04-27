# functionSpec: generate-ai-campaign-image

## Objetivo

Worker interno que gera uma imagem de campanha IA para um asset especifico, faz upload no bucket `ai-campaign-assets` e atualiza o status do asset.

## Acesso

- Metodo: `POST`
- Gateway publico: deploy com `--no-verify-jwt`
- Guard interno: `requireServiceRole(req)` com bearer `SUPABASE_SERVICE_ROLE_KEY`
- Esta funcao nao e chamada diretamente por usuario humano do dashboard.

```bash
supabase functions deploy generate-ai-campaign-image --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

## Request

```json
{
  "job_id": "uuid",
  "asset_id": "uuid",
  "compra_id": "uuid",
  "group_name": "moderna",
  "format": "1:1",
  "celebrity_png_url": "https://...",
  "client_logo_url": "https://...",
  "campaign_image_url": "https://...",
  "reference_image_url": "https://...",
  "prompt": "...",
  "prompt_version": "v1"
}
```

Campos obrigatorios:

- `job_id`
- `asset_id`
- `compra_id`
- `group_name`
- `format`
- `celebrity_png_url`
- `prompt`
- `prompt_version`

Campos opcionais incluem URLs complementares, modelo/base URL Gemini, parametros de geracao, `aspect_ratio`, `safety_settings` e `system_instruction_text`.

## Comportamento

1. Valida metodo e bearer service role.
2. Valida JSON e campos obrigatorios.
3. Marca o asset como `processing`.
4. Chama o gerador compartilhado de imagem.
5. Em sucesso, faz upload no bucket `ai-campaign-assets`, marca o asset como `completed` e incrementa o progresso do job.
6. Em falha de modelo, upload ou erro inesperado, marca o asset como `failed` e registra erro em `ai_campaign_errors`.

## Response

Sucesso:

```json
{
  "success": true,
  "asset_id": "uuid",
  "status": "completed"
}
```

Falha de geracao tratada:

```json
{
  "success": false,
  "asset_id": "uuid",
  "status": "failed",
  "error": "mensagem"
}
```

## Erros

| HTTP | Code | Descricao |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Bearer service role ausente ou invalido. |
| 400 | `INVALID_BODY` | JSON invalido. |
| 400 | `MISSING_FIELDS` | Campos obrigatorios ausentes. |
| 405 | `METHOD_NOT_ALLOWED` | Metodo diferente de POST. |
| 500 | `CONFIG_ERROR` | Env vars Supabase ausentes. |
| 200 | `WORKER_UNHANDLED_ERROR` | Erro inesperado tratado com asset marcado como `failed`. |

## Dependencias

- `_shared/service-role-auth.ts`
- `_shared/ai-campaign/image-generator.ts`
- Bucket `ai-campaign-assets`
- Tabelas `ai_campaign_assets`, `ai_campaign_jobs` e `ai_campaign_errors`
