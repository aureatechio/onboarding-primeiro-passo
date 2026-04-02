# functionSpec: omie-upsert-service

## Goal

Atualiza um serviço existente na OMIE usando os dados do `omie_sync` local combinados com a configuração fiscal ativa (`omie_nfse_config`). Usado para corrigir dados de serviço após alterações de alíquotas, descrição ou tributação.

## Inputs

### Auth
- `Authorization: Bearer <service-role-key>` — aceita `SUPABASE_SERVICE_ROLE_KEY`, `CRM_SUPABASE_SERVICE_ROLE_KEY` ou `CRM_SUPABASE_SECRET_KEY`
- `x-admin-password: <ADMIN_PASSWORD>` — opcional (se fornecido, deve ser válido)

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role key (fallback chain) |
| `CRM_SUPABASE_SERVICE_ROLE_KEY` | Sim* | Alternativa 1 |
| `CRM_SUPABASE_SECRET_KEY` | Sim* | Alternativa 2 |
| `OMIE_APP_KEY` | Sim | App key da API OMIE |
| `OMIE_APP_SECRET` | Sim | App secret da API OMIE |
| `OMIE_BASE_URL` | Não | Base URL da OMIE (padrão: `https://app.omie.com.br/api/v1`) |
| `OMIE_SERVICOS_API_URL` | Não | URL específica de serviços (padrão: `{OMIE_BASE_URL}/servicos/servico/`) |
| `ADMIN_PASSWORD` | Não | Senha admin (padrão: `megazord`) |

### Request Body (POST apenas)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `compra_id` | `string` (UUID) | Sim | ID da compra (lido de `record.compra_id` ou `payload.compra_id` ou raiz) |

## Validations

- `compra_id` ausente ou inválido → 400 `INVALID_REQUEST`
- `omie_sync` não encontrado → 404 `SYNC_NOT_FOUND`
- `omie_servico_id` ausente em `omie_sync` → 400 `MISSING_SERVICE_ID`
- `omie_servico_payload` ausente → 400 `MISSING_REQUIRED_FIELDS`
- `omie_nfse_config` ativa não encontrada → 500 `NFSE_CONFIG_NOT_FOUND`
- Dados do serviço inválidos (alíquota fora de 0–100, retencao ≠ S/N, vigência inválida) → 400 `MISSING_REQUIRED_FIELDS`

### Vigência válida
Deve ser inteiro 3, 6, 9 ou 12 (meses). Pode ser passado como número ou string (`"6"`, `"6 meses"`).

## Behavior

1. Busca `omie_sync` pelo `compra_id` — extrai `omie_servico_id` e `omie_servico_payload`
2. Busca `omie_nfse_config` ativa — obtém alíquotas e configurações fiscais
3. Faz merge: **config ativa tem precedência** sobre dados do payload salvo para alíquotas e retenções
4. **Se `cCodIntServ` ausente no payload:** chama `ConsultarCadastroServico` na OMIE para obter o código interno (timeout 10s)
5. Constrói payload `UpsertCadastroServico` com:
   - `intEditar`: `nCodServ` + `cCodIntServ`
   - `descricao`: `cDescrCompleta` (formato: `{celebridade} - UF: {uf} - Cidade: {cidade} - Seg: {segmento} - SubSeg: {subsegmento} - Vigencia: {vigencia}`)
   - `cabecalho`: truncado a 100 chars para `cDescricao`, tributos, valor em reais, categoria
   - `impostos`: alíquotas e retenções da config ativa
6. Chama `UpsertCadastroServico` na OMIE (timeout 10s)
7. Atualiza `omie_sync` com `omie_status='processing'`, novo `omie_servico_id` e `omie_servico_payload` atualizado

## External Dependencies

- **OMIE API** (`/servicos/servico/`): `ConsultarCadastroServico`, `UpsertCadastroServico`
- **Supabase**: `omie_sync`, `omie_nfse_config`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `INVALID_REQUEST` | `compra_id` inválido |
| 400 | `MISSING_SERVICE_ID` | `omie_servico_id` ausente no sync |
| 400 | `MISSING_REQUIRED_FIELDS` | Payload ou campos obrigatórios ausentes |
| 401 | `INTERNAL_AUTH_INVALID` | Auth header inválido |
| 401 | `ADMIN_PASSWORD_INVALID` | `x-admin-password` inválido |
| 404 | `SYNC_NOT_FOUND` | `omie_sync` não encontrado |
| 500 | `NFSE_CONFIG_NOT_FOUND` | Config ativa ausente |
| 502 | `OMIE_ERROR` | OMIE retornou `faultcode` |
| 503 | `OMIE_REQUEST_FAILED` | Falha HTTP ao chamar OMIE |
| 504 | `OMIE_TIMEOUT` | Timeout na chamada OMIE |

Em falhas OMIE, atualiza `omie_sync.omie_status = 'failed'` com `last_error`.

## Observability

- `correlation_id` no response (gerado via `x-correlation-id` header ou `crypto.randomUUID()`)
- `omie_sync.last_error` atualizado em falhas com prefixo `omie-upsert-service: {mensagem}`

## Examples

```json
POST /functions/v1/omie-upsert-service
Authorization: Bearer <service-role-key>

{ "compra_id": "uuid-da-compra" }

// Response 200
{
  "success": true,
  "action": "upsert_servico",
  "compra_id": "uuid-da-compra",
  "nCodServ": 12345,
  "cCodIntServ": "SERV_uuid",
  "correlation_id": "uuid-correlation"
}
```
