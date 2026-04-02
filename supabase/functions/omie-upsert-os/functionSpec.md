# Function Spec — omie-upsert-os

## Goal
Sincronizar OS OMIE por `compra_id`, usando o banco como fonte de verdade e aplicando upsert (`IncluirOS`/`AlterarOS`) automaticamente.

## Inputs
- **HTTP method**: `POST` (`OPTIONS` para CORS)
- **Path**: `/functions/v1/omie-upsert-os`
- **Headers**:
  - `Authorization: Bearer <service-role-or-secret>` (required)
  - `x-admin-password` (optional; when informed, must match `ADMIN_PASSWORD`)
  - `x-correlation-id` (optional)
  - `Content-Type: application/json`
- **Body**:
  - obrigatório: `compra_id` (UUID)

## Behavior
1. Valida método, auth e payload.
2. Faz precheck de existencia da compra e adquire lease lock por compra via RPC `omie_acquire_upsert_lease`.
3. Carrega dados canônicos da compra, cliente, vendedor/agência e config ativa OMIE.
4. Recalcula payload da OS a partir do banco.
   - Propaga `compras.tipo_venda` para o payload canônico (`caracteristica_tipo_venda`) com mapeamento:
     - `Venda` -> `Venda nova`
     - `Renovacao` -> `Renovação`
     - `Upsell` -> `Upsell`
5. Se já existe `omie_os_id`, chama `ConsultarOS` e segue por `AlterarOS`.
6. Se não existe `omie_os_id`, segue por `IncluirOS`.
7. Persiste `omie_sync` e `notas_fiscais.omie_os_id`.
8. Libera o lease no `finally`; se a execucao morrer antes disso, o TTL permite recuperacao automatica.
9. Retorna `correlation_id` no sucesso.

### Lease Lock — Detalhes
- RPC: `omie_acquire_upsert_lease`
- TTL: **300 segundos (5 minutos)**
- Se lock ja existe: retorna **409 `LOCK_NOT_ACQUIRED`** — isso **NAO e erro**; e lease ativa valida indicando que outra execucao esta em andamento
- `finally` block garante liberacao do lock mesmo em erro (previne deadlock)
- Se execucao morrer sem liberar, o TTL de 300s garante recuperacao automatica

### Modo backfill_payload_only
Quando `backfill_payload_only: true` no body:
- Retorna payload canônico da OS sem:
  - Escrever em `omie_sync`
  - Escrever em `notas_fiscais`
  - Chamar APIs OMIE
- Uso exclusivo para DEBUG e migracao. Nunca usar em automacao de producao.

### Campo `{{cidade}}` no template de descrição do serviço (Direito de uso)
O template de descrição da OS usa `{{cidade}}` para compor o campo "Direito de uso". A variável é resolvida exclusivamente a partir de `compra.regiaocomprada` — praça comercial da venda. Não há fallback para `cliente.cidade`.

`regiaocomprada` é campo obrigatório: compras sem este valor falham a validação com `MISSING_REQUIRED_FIELDS`.

Os demais usos de `cliente.cidade` (endereço fiscal no payload OMIE, validações de campo obrigatório) **não** são afetados por esta lógica.

### Campo `cCidPrestServ` (cidade de prestação fiscal)
`cCidPrestServ` em `InformacoesAdicionais` é resolvido via `resolveMunicipioIbge` (`_shared/omie/municipio-ibge.ts`) usando `compra.regiaocomprada` + `cliente.estado`. Estratégia: lookup local em `sgc_cidades` (ilike) → lookup normalizado → fallback BrasilAPI. Formato bem-sucedido: `"Cidade (UF)"`. Se a resolução falhar, usa `compra.regiaocomprada` como fallback com log `[OMIE_CIDADE_RESOLVE_FAIL]`.

## Error Handling
- **405** `METHOD_NOT_ALLOWED`
- **400** `INVALID_JSON`
- **400** `INVALID_REQUEST`
- **401** `ADMIN_PASSWORD_INVALID` / `INTERNAL_AUTH_INVALID`
- **404** `COMPRA_NOT_FOUND` / `CLIENTE_NOT_FOUND`
- **409** `LOCK_NOT_ACQUIRED` — lease ativa em andamento; **NAO e erro irrecuperavel**, apenas indica concorrencia
- **409** `OS_NOT_EDITABLE` — OS em estado que nao permite edicao na OMIE
- **500** `CONFIG_ERROR` / `NFSE_CONFIG_NOT_FOUND` / `VENDEDOR_QUERY_ERROR`
- **502** `OMIE_ERROR`
- **500** `OMIE_REQUEST_FAILED`

## Outputs
```json
{
  "success": true,
  "compra_id": "uuid",
  "action": "incluir_os|alterar_os",
  "omie_os_id": "1234567890",
  "synced_from_db": true,
  "warnings": [],
  "correlation_id": "uuid"
}
```
