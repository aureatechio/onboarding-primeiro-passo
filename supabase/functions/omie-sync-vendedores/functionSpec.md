# functionSpec: omie-sync-vendedores

## Goal

Sincroniza vendedores da API OMIE para o banco local (OMIE → DB). Pagina todos os vendedores OMIE, atualiza registros existentes no banco, insere novos e inativa os que não estão mais no OMIE.

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
| `OMIE_SYNC_VENDEDORES_PAGE_SIZE` | Não | Registros por página (padrão: 100) |
| `OMIE_SYNC_VENDEDORES_TIMEOUT_MS` | Não | Timeout por página (padrão: 10000ms) |

Sem body — aceita POST ou GET sem parâmetros adicionais.

## Validations

- `OMIE_APP_KEY`/`OMIE_APP_SECRET` ausentes → 500 `CONFIG_ERROR`
- `SUPABASE_SERVICE_ROLE_KEY` ausente → 500 `CONFIG_ERROR`
- Auth header inválido → 401 `UNAUTHORIZED`
- Vendedor OMIE sem código numérico → `skipped_invalid` (não interrompe)

## Behavior

### Fase 1 — Paginação OMIE
1. Pagina `ListarVendedores` (`apenas_importado_api: 'N'`) até carregar todas as páginas
2. Para cada item extrai `omie_usuario_codigo` dos campos `nCodigo`, `nCodVendedor`, `nCodVend`, `codigo`, `codigo_vendedor`
3. Constrói `Map<code, {nome, email}>` com todos os vendedores remotos

### Fase 2 — Upsert no banco
Para cada vendedor remoto (por `omie_usuario_codigo`):
1. Busca no banco por `omie_usuario_codigo` → se achar: `update` (action: `updated`)
2. Se não achar por código, busca por `email` (ilike em `email` e depois em `omie_email`) → se achar: `update` (action: `updated`)
3. Se não achar por email: `insert` com nome `Vendedor OMIE {code}` se sem nome (action: `inserted`)

Campos atualizados: `omie_usuario_codigo`, `omie_ativo=true`, `omie_nome`, `omie_email`, `omie_last_sync_at`

### Fase 3 — Inativação
Busca vendedores locais com `omie_usuario_codigo IS NOT NULL` e `omie_ativo=true`. Para os que **não** estão no mapa remoto: `update omie_ativo=false, omie_last_sync_at`.

## External Dependencies

- **OMIE API** (`/api/v1/geral/vendedores/`): `ListarVendedores`
- **Supabase**: tabela `vendedores`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Auth header inválido |
| 405 | `METHOD_NOT_ALLOWED` | Método não permitido |
| 500 | `CONFIG_ERROR` | Env vars ausentes |
| 500 | `SYNC_FAILED` | Erro geral na paginação ou no banco |

Erros por vendedor (upsert/inativação) são registrados em `details[]` (máx 30 itens) e não interrompem o loop.

## Observability

Retorno contém:
- `pages` — páginas OMIE consumidas
- `total_remote` — total de vendedores no OMIE
- `inserted` — novos registros criados no banco
- `updated` — registros atualizados (por código ou por email)
- `inactivated` — vendedores inativados localmente
- `skipped_invalid` — vendedores OMIE sem código
- `errors` — erros individuais por vendedor
- `elapsed_ms` — tempo total

## Examples

```json
POST /functions/v1/omie-sync-vendedores
Authorization: Bearer <service-role-key>

// Response 200
{
  "success": true,
  "pages": 2,
  "total_remote": 150,
  "inserted": 3,
  "updated": 145,
  "inactivated": 2,
  "skipped_invalid": 0,
  "errors": 0,
  "details": [],
  "elapsed_ms": 3200
}
```
