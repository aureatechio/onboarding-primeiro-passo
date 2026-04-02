# functionSpec: update-omie-nfse-config

## Goal

Atualiza parcialmente a configuração NFS-e ativa (`omie_nfse_config`) usada pelo orquestrador OMIE. Apenas campos fornecidos no body são atualizados (PATCH semântico).

## Inputs

### Auth
- `x-admin-password: <ADMIN_PASSWORD>` — obrigatório

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `ADMIN_PASSWORD` | Não | Senha admin (padrão: `megazord`) |

### Request Body (PATCH)

Todos os campos são opcionais. Apenas campos presentes no body são atualizados.

| Campo | Tipo | Validação |
|-------|------|-----------|
| `codigo_servico_municipal` | `string` | String não vazia |
| `codigo_lc116` | `string` | String não vazia |
| `tipo_tributacao` | `string` | String não vazia |
| `codigo_categoria` | `string` | String não vazia |
| `aliquota_iss` | `number` | Entre 0 e 100 |
| `retencao_iss` | `string` | `'S'` ou `'N'` |
| `aliquota_ir` | `number` | Entre 0 e 100 |
| `retencao_ir` | `string` | `'S'` ou `'N'` |
| `aliquota_inss` | `number` | Entre 0 e 100 |
| `retencao_inss` | `string` | `'S'` ou `'N'` |
| `aliquota_pis` | `number` | Entre 0 e 100 |
| `retencao_pis` | `string` | `'S'` ou `'N'` |
| `aliquota_cofins` | `number` | Entre 0 e 100 |
| `retencao_cofins` | `string` | `'S'` ou `'N'` |
| `aliquota_csll` | `number` | Entre 0 e 100 |
| `retencao_csll` | `string` | `'S'` ou `'N'` |
| `conta_corrente_id` | `number \| null` | Inteiro positivo ou null |
| `os_etapa` | `string` | 2 dígitos (`/^\d{2}$/`) |
| `enviar_link_nfse` | `boolean \| string` | Truthy/falsy aceitos: `true/false`, `"1"/"0"`, `"s"/"n"` |
| `enviar_boleto` | `boolean \| string` | Truthy/falsy aceitos |
| `departamento_payload` | `unknown[] \| string` | JSON array ou string JSON |
| `departamentos_codigos` | `string` | CSV de códigos, deduplicado |
| `descricao_servico_template` | `string` | String não vazia; variáveis: `{{numero_proposta}}`, `{{celebridade}}`, etc. |
| `usar_imagemproposta_id_como_numero` | `boolean \| string` | Truthy/falsy aceitos |

## Validations

- Método ≠ PATCH → 405 `METHOD_NOT_ALLOWED`
- `x-admin-password` inválido → 401 `UNAUTHORIZED`
- JSON inválido → 400 `INVALID_JSON`
- Body sem campos válidos → 400 `NO_VALID_FIELDS`
- Cada campo com valor inválido → 400 `VALIDATION_ERROR` (fail-fast: retorna no primeiro campo inválido)
- Config ativa não encontrada → 404 `NOT_FOUND`

## Behavior

1. Valida `x-admin-password`
2. Parseia body JSON
3. Para cada campo presente no body: normaliza e valida
4. Se nenhum campo válido: retorna erro
5. Adiciona `updated_at = now()`
6. Busca config ativa por `ativo=true` → obtém `id`
7. Aplica `UPDATE` apenas nos campos fornecidos
8. Retorna config completa atualizada

## External Dependencies

- **Supabase**: `omie_nfse_config`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `INVALID_JSON` | Body não é JSON válido |
| 400 | `NO_VALID_FIELDS` | Nenhum campo válido fornecido |
| 400 | `VALIDATION_ERROR` | Campo com valor inválido (mensagem específica) |
| 401 | `UNAUTHORIZED` | `x-admin-password` inválido |
| 404 | `NOT_FOUND` | Config ativa não encontrada |
| 405 | `METHOD_NOT_ALLOWED` | Método não PATCH |
| 500 | `CONFIG_ERROR` | `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` ausentes |
| 500 | `UPDATE_FAILED` | Erro ao atualizar no banco |
| 500 | `INTERNAL_ERROR` | Erro não tratado |

## Observability

Sem logs estruturados. Erros retornam `details` com mensagem do Supabase.

## Examples

```json
PATCH /functions/v1/update-omie-nfse-config
x-admin-password: megazord

{
  "aliquota_iss": 5.0,
  "retencao_iss": "N",
  "os_etapa": "50",
  "descricao_servico_template": "Proposta n. {{numero_proposta}}\nDireito de uso: {{celebridade}} - {{cliente_nome}}"
}

// Response 200
{
  "success": true,
  "config": { ...config completa atualizada... }
}
```

```json
// Erro de validação
PATCH /functions/v1/update-omie-nfse-config
{ "aliquota_iss": 150 }

// Response 400
{
  "error": "aliquota_iss deve ser numero entre 0 e 100",
  "code": "VALIDATION_ERROR"
}
```
