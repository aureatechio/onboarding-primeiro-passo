# functionSpec: omie-push-vendedores

## Goal

Sincroniza vendedores locais (`public.vendedores`) para a API OMIE (DB → OMIE). Para cada vendedor local com email e nome válidos, cria ou atualiza o registro na OMIE e salva o `omie_usuario_codigo` resultante. Suporta modo `preview` (sem escrita) e `apply` (com escrita).

## Inputs

### Auth
- `Authorization: Bearer <service-role-key>` — aceita `SUPABASE_SERVICE_ROLE_KEY`, `CRM_SUPABASE_SERVICE_ROLE_KEY` ou `CRM_SUPABASE_SECRET_KEY`

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role key (fallback chain) |
| `CRM_SUPABASE_SERVICE_ROLE_KEY` | Sim* | Alternativa 1 |
| `CRM_SUPABASE_SECRET_KEY` | Sim* | Alternativa 2 |
| `OMIE_APP_KEY` | Sim | App key da API OMIE |
| `OMIE_APP_SECRET` | Sim | App secret da API OMIE |
| `OMIE_VENDEDORES_API_URL` | Não | URL da API (padrão: `https://app.omie.com.br/api/v1/geral/vendedores/`) |
| `OMIE_SYNC_VENDEDORES_TIMEOUT_MS` | Não | Timeout por chamada OMIE (padrão: 10000ms) |

### Request Body (POST) / Query Params (GET)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `mode` | `'preview' \| 'apply'` | `apply` | `preview` não escreve no banco |
| `limit` | `number` | 200 | Máx vendedores a processar (máx 1000) |
| `offset` | `number` | 0 | Offset para paginação |
| `only_missing_omie_codigo` | `boolean` | `false` | Filtra apenas vendedores sem `omie_usuario_codigo` |
| `vendedor_ids` | `string[]` | `[]` | Filtra por IDs específicos (POST apenas) |

## Validations

- `mode` deve ser `preview` ou `apply` → 400 `INVALID_REQUEST`
- `limit` deve ser inteiro entre 1 e 1000 → 400 `INVALID_REQUEST`
- `offset` deve ser inteiro ≥ 0 → 400 `INVALID_REQUEST`
- Vendedor sem `nome` válido ou `email` válido → `skipped_invalid` (não é erro)
- `OMIE_APP_KEY`/`OMIE_APP_SECRET` ausentes → 500 `CONFIG_ERROR`

## Behavior

1. Busca vendedores locais com filtros opcionais (`only_missing_omie_codigo`, `vendedor_ids`)
2. Para cada vendedor com nome e email válidos:
   - Gera `omie_cod_int`: mantém `omie_cod_int` existente (máx 30 chars) ou cria `VDR_{uuid_sem_hifens[:26]}`
   - **Se sem `omie_usuario_codigo`:**
     - `ListarVendedores` filtrado por email na OMIE
     - Se achar por email → `action: 'linked'`
   - **Se `omie_usuario_codigo` presente ou linked:** `AlterarVendedor` (action: `updated`)
   - **Se não encontrado:** `IncluirVendedor` (action: `created`)
   - Em modo `apply`: atualiza `vendedores` com `omie_usuario_codigo`, `omie_cod_int`, `omie_ativo=true`, `omie_last_sync_at`
3. Retorna sumário com contadores e `details[]` (máx 100 itens)

### Lógica de omie_cod_int
- Preserva `omie_cod_int` existente (truncado a 30 chars)
- Gera novo: `VDR_` + UUID compactado (sem hífens, 26 chars) = 30 chars total

## External Dependencies

- **OMIE API** (`/api/v1/geral/vendedores/`): `ListarVendedores`, `IncluirVendedor`, `AlterarVendedor`
- **Supabase**: tabela `vendedores`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Auth header inválido |
| 400 | `INVALID_REQUEST` | Parâmetro inválido |
| 405 | `METHOD_NOT_ALLOWED` | Método não permitido |
| 500 | `CONFIG_ERROR` | Env vars ausentes |
| 500 | `SYNC_FAILED` | Erro geral — retorna sumário parcial |

Erros por vendedor são registrados em `details[]` com `action: 'sync_error'` (não interrompem o loop).

## Observability

Logs emitidos por vendedor:
- `action: 'created'` — vendedor criado na OMIE
- `action: 'linked'` — vendedor encontrado por email e vinculado
- `action: 'updated'` — vendedor atualizado na OMIE
- `action: 'skipped_invalid'` — nome ou email inválido
- `action: 'sync_error'` — erro ao processar vendedor

Campos no retorno: `total_local`, `processed`, `created`, `updated`, `linked`, `skipped_invalid`, `errors`, `elapsed_ms`

## Examples

```json
POST /functions/v1/omie-push-vendedores
Authorization: Bearer <service-role-key>

{ "mode": "preview", "limit": 50 }

// Response 200
{
  "success": true,
  "mode": "preview",
  "total_local": 12,
  "processed": 10,
  "created": 0,
  "updated": 8,
  "linked": 2,
  "skipped_invalid": 2,
  "errors": 0,
  "details": [...],
  "elapsed_ms": 1234
}
```
