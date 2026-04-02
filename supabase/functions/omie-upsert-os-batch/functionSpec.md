# functionSpec: omie-upsert-os-batch

## Goal

Orquestra o upsert em massa de OS OMIE para uma lista de `compra_id`s, processando em blocos com concorrência controlada e retry de falhas. Persiste estado em `omie_upsert_os_batch_runs` e `omie_upsert_os_batch_items`.

## Inputs

### Auth
- `Authorization: Bearer <service-role-key>` — aceita `SUPABASE_SERVICE_ROLE_KEY`, `CRM_SUPABASE_SERVICE_ROLE_KEY` ou `CRM_SUPABASE_SECRET_KEY`
- `x-admin-password: <ADMIN_PASSWORD>` — obrigatório para todas as ações de escrita

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role key (fallback chain) |
| `CRM_SUPABASE_SERVICE_ROLE_KEY` | Sim* | Alternativa 1 |
| `CRM_SUPABASE_SECRET_KEY` | Sim* | Alternativa 2 |
| `ADMIN_PASSWORD` | Sim | Senha admin (padrão: `megazord`) |

*Uma das três deve estar presente.

### Request Body (POST) ou Query Params (GET)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `action` | `'start' \| 'process' \| 'status' \| 'retry-failed'` | Sim | Ação a executar |
| `compra_ids` | `string[]` | Para `start` | Lista de UUIDs (máx 100) |
| `run_id` | `string` (UUID) | Para `process`, `status`, `retry-failed` | ID da run existente |
| `chunk_size` | `number` | Não | Tamanho do bloco (padrão 20, máx 50) |
| `concurrency` | `number` | Não | Concorrência (padrão 2, máx 5) |
| `actor_email` | `string` | Não | Email do executor (audit trail) |

## Validations

- `action` deve ser um dos 4 valores válidos → 400 `INVALID_ACTION`
- `compra_ids` em `start`: obrigatório, não vazio, ≤ 100 itens, todos UUIDs válidos → 400/413
- `run_id` em `process`/`status`/`retry-failed`: obrigatório UUID válido → 400
- JWT downstream: precisa ser um JWT válido (3 partes) — `SUPABASE_SERVICE_ROLE_KEY` ou `CRM_SUPABASE_SERVICE_ROLE_KEY` → 500 `CONFIG_ERROR` se ausente

## Behavior

### action: start
1. Deduplica `compra_ids` (trim + unique)
2. Cria registro em `omie_upsert_os_batch_runs` com status `pending`
3. Cria todos os itens em `omie_upsert_os_batch_items` com status `pending`
4. Retorna `run_id`, `requested_count`, `chunk_size`, `concurrency`

### action: process
1. Busca run por `run_id`; se `completed`/`failed`, recalcula métricas e retorna imediatamente
2. Marca run como `running` (se ainda não iniciada)
3. Carrega até `chunk_size` itens `pending` da run (ordenados por `created_at`)
4. Faz claim otimista de cada item (CAS: atualiza `pending` → `running`)
5. Processa itens com `runWithConcurrency(concurrency)`:
   - Chama `omie-upsert-os` via HTTP interno com header `x-correlation-id: batch-{runId}-{itemId}-{attempt}`
   - Retry de até `MAX_RETRY_ATTEMPTS=2` apenas para erros retryáveis (5xx, OMIE_ERROR, timeout/network)
   - Erros não-retryáveis: `MISSING_REQUIRED_FIELDS`, `OS_NOT_EDITABLE`, `LOCK_NOT_ACQUIRED`
   - Persiste `success`/`failed` + `error_code`, `error_message`, `correlation_id`, `response_payload`, `duration_ms`
6. Recalcula e atualiza métricas da run (`refreshRunMetrics`)
7. Retorna sumário com contadores

### action: status
1. Busca run + itens (paginados com `limit`/`offset`, máx 200)
2. Recalcula métricas da run
3. Retorna objeto `run`, `summary`, `items[]`, `pagination`

### action: retry-failed
1. Busca itens `failed` da run
2. Cria nova run com `source_run_id` apontando para a original
3. Insere itens pendentes para os `compra_id`s com falha
4. Retorna `run_id` da nova run

## External Dependencies

- **omie-upsert-os** (via HTTP interno): chamado para cada item no `process`
- **Supabase**: `omie_upsert_os_batch_runs`, `omie_upsert_os_batch_items`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `INVALID_ACTION` | `action` inválido |
| 400 | `INVALID_REQUEST` | `compra_ids` vazio, UUID inválido ou `run_id` inválido |
| 401 | `UNAUTHORIZED` | Auth header inválido |
| 401 | `ADMIN_PASSWORD_INVALID` | `x-admin-password` inválido |
| 404 | `RUN_NOT_FOUND` | Run não encontrada |
| 413 | `BATCH_LIMIT_EXCEEDED` | `compra_ids` > 100 |
| 500 | `CONFIG_ERROR` | Env vars ausentes |
| 500 | `DB_ERROR` | Falha ao criar run/itens ou carregar dados |

## Observability

- Cada item persiste `correlation_id: batch-{runId}-{itemId}-{attempt}`
- `duration_ms` por item
- `error_code` e `error_message` por item com falha
- `response_payload` completo da chamada downstream

## Examples

### start
```json
POST /functions/v1/omie-upsert-os-batch
Authorization: Bearer <service-role-key>
x-admin-password: <admin-password>

{
  "action": "start",
  "compra_ids": ["uuid-1", "uuid-2"],
  "chunk_size": 10,
  "concurrency": 3,
  "actor_email": "admin@aurea.com.br"
}
// Response 200
{
  "success": true,
  "run_id": "uuid-run",
  "requested_count": 2,
  "chunk_size": 10,
  "concurrency": 3
}
```

### process
```json
POST /functions/v1/omie-upsert-os-batch
{ "action": "process", "run_id": "uuid-run" }
// Response 200
{
  "success": true,
  "run_id": "uuid-run",
  "status": "running",
  "processed_count": 10,
  "success_count": 9,
  "failed_count": 1,
  "pending_count": 5
}
```

### status (GET)
```
GET /functions/v1/omie-upsert-os-batch?action=status&run_id=uuid-run&limit=20&offset=0
```
