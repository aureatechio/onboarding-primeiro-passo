# Function Spec - omie-orchestrator

## Goal
Orquestrar a emissao NFS-e via OMIE apos pagamento aprovado, garantindo sequencia `cliente -> servico -> OS`, persistencia em `notas_fiscais` e sincronizacao de status em `omie_sync`.

## Inputs
- **HTTP method**: `POST` (`OPTIONS` para CORS)
- **Path**: `/functions/v1/omie-orchestrator`
- **Headers**:
  - `Authorization: Bearer <service-role-or-secret>` (required)
  - `Content-Type: application/json`
- **Body shape**:
  - aceita payload na raiz, em `payload` ou em `record`
  - obrigatorio:
    - `compra_id` (UUID)
  - opcionais:
    - `nota_fiscal_id` (UUID)
    - `force` (boolean) - reprocessa mesmo quando ja sincronizado
    - `backfill_payload_only` (boolean) — modo DEBUG: retorna payload sem escrever em `omie_sync`/`notas_fiscais` nem chamar APIs OMIE. Nunca usar em producao automatizada.

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — **cadeia de fallback de autenticacao:**
  1. `SUPABASE_SERVICE_ROLE_KEY`
  2. `CRM_SUPABASE_SERVICE_ROLE_KEY`
  3. `CRM_SUPABASE_SECRET_KEY`
- `OMIE_APP_KEY`
- `OMIE_APP_SECRET`
- `OMIE_BASE_URL` (optional)
- `OMIE_STATUS_POLL_DELAYS_MS` (optional, csv em ms; default: `3000,7000,12000,20000`)
- `OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS` (optional, default: `6000`)

## Behavior
1. Valida metodo, auth e payload (`compra_id` obrigatorio, UUID valido).
2. Busca dados necessarios (`compras`, `clientes`, `omie_sync`, `notas_fiscais`, `omie_nfse_config`).
3. Aplica idempotencia:
   - se `omie_status = synced` e `force != true`, retorna `OMIE_ALREADY_SYNCED`.
   - caso contrario, marca `omie_sync` como `processing` e incrementa tentativas.
4. Executa fluxo interno:
   - `omie-create-client`
   - `omie-create-service`
   - `omie-create-os`
5. Faz upsert em `notas_fiscais` com `status = Processing`, `emissor = omie`, `omie_os_id`.
6. Executa polling `StatusOS` com delays configuraveis + timeout por tentativa.
7. Resultado do polling:
   - `cStatusLote = '004'` (sucesso) -> chama `ObterNFSe`, grava documentos em `notas_fiscais` e marca `Issued`.
   - `cStatusLote = '003'` (erro) -> grava `Error` com mensagem da prefeitura em `omie_sync.last_error`.
   - Qualquer outro status -> marca `awaiting_nfse` para retry posterior via `omie-nfse-retry-worker`.

### Modo backfill_payload_only
Quando `backfill_payload_only: true`:
- Retorna payload completo que seria enviado (cliente, servico, OS)
- **NAO** escreve em `omie_sync` nem em `notas_fiscais`
- **NAO** chama nenhuma API OMIE
- **NAO** executa polling
- Uso exclusivo para DEBUG e migracao. Nunca usar em automacao de producao.
8. Atualiza `omie_sync` com status final e IDs OMIE.

## Error Handling
- **400** `INVALID_JSON` - JSON invalido.
- **400** `VALIDATION_ERROR` - payload invalido (`compra_id`/`nota_fiscal_id`).
- **401** `UNAUTHORIZED` - bearer invalido.
- **404** `COMPRA_NOT_FOUND` - compra nao encontrada.
- **404** `CLIENTE_NOT_FOUND` - cliente nao encontrado.
- **409** `OMIE_ALREADY_SYNCED` - ja sincronizado e sem `force`.
- **500** `CONFIG_ERROR` / `NFSE_CONFIG_NOT_FOUND` - configuracao ausente.
- **502** `OMIE_EDGE_ERROR` / `OMIE_OS_ID_MISSING` - erro em Edge OMIE.

## Observability
- Logs de polling por tentativa:
  - `attempt`, `delay_ms`, `elapsed_ms`, `cStatusLote`, `compra_id`, `omie_os_id`
- Log final de polling com status consolidado e duracao total.
- Atualizacoes de `omie_sync` em todas as saidas (`processing`, `failed`, `pending`, `synced`).

## Example Response
```json
{
  "success": true,
  "compra_id": "550e8400-e29b-41d4-a716-446655440000",
  "omie_os_id": "456789",
  "status": "synced",
  "numero": "12345"
}
```
