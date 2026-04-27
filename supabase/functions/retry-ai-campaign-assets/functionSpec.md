# functionSpec: retry-ai-campaign-assets

## Objetivo

Reprocessa assets de campanha IA de um job existente. Permite retry por asset unico, assets com falha, categoria ou todos os assets do job.

## Acesso

- Metodo: `POST`
- Autenticacao: JWT obrigatorio + RBAC `admin` ou `operator`
- Guard: `requireRole(req, ["admin", "operator"])`
- Deploy: sem `--no-verify-jwt`

```bash
supabase functions deploy retry-ai-campaign-assets --project-ref awqtzoefutnfmnbomujt
```

## Request

```json
{
  "job_id": "uuid",
  "mode": "failed",
  "asset_id": "uuid-opcional",
  "group_name": "moderna-opcional"
}
```

Campos:

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `job_id` | Sim | Job em `ai_campaign_jobs`. |
| `mode` | Nao | `single`, `failed`, `category` ou `all`. Default: `failed`. |
| `asset_id` | Apenas `single` | Asset alvo do retry. |
| `group_name` | Apenas `category` | `moderna`, `clean` ou `retail`. |

## Comportamento

1. Valida metodo, JWT e role.
2. Valida `job_id`, `mode`, `asset_id` e `group_name`.
3. Bloqueia retry se houver assets `pending` ou `processing`, exceto quando o job estiver travado por mais de 10 minutos.
4. Seleciona assets alvo conforme o modo.
5. Reseta assets alvo para `pending`, limpa URL/dimensoes, marca job como `processing`.
6. Dispara `create-ai-campaign-job` com bearer service role para reprocessar o job.

## Response

Sucesso:

```json
{
  "success": true,
  "job_id": "uuid",
  "compra_id": "uuid",
  "mode": "failed",
  "retried_count": 3
}
```

## Erros

| HTTP | Code | Descricao |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` / `INVALID_JWT` | JWT ausente, invalido ou expirado. |
| 403 | `FORBIDDEN` | Role sem permissao ou usuario inativo. |
| 400 | `INVALID_BODY` | JSON invalido. |
| 400 | `INVALID_JOB_ID` | `job_id` ausente ou invalido. |
| 400 | `INVALID_ASSET_ID` | `asset_id` ausente/invalido em `mode=single`. |
| 400 | `INVALID_GROUP` | `group_name` invalido em `mode=category`. |
| 404 | `JOB_NOT_FOUND` / `ASSET_NOT_FOUND` | Job ou asset inexistente. |
| 409 | `JOB_BUSY` / `INVALID_ASSET_STATE` | Job ainda em andamento ou asset nao elegivel. |
| 500 | `CONFIG_ERROR` / `DB_ERROR` / `RETRY_TRIGGER_ERROR` | Falha de ambiente, banco ou disparo do worker. |

## Dependencias

- `ai_campaign_jobs`
- `ai_campaign_assets`
- `create-ai-campaign-job` chamado internamente com service role
- `_shared/rbac.ts`
