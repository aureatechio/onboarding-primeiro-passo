# functionSpec: get-omie-nfse-config

## Goal

Retorna a configuração NFS-e ativa (`omie_nfse_config`) usada pelo orquestrador OMIE. Endpoint de leitura para administradores.

## Inputs

### Auth
- `x-admin-password: <ADMIN_PASSWORD>` — obrigatório

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `ADMIN_PASSWORD` | Não | Senha admin (padrão: `megazord`) |

### Request
- Método: `GET`
- Sem body
- Sem query params

## Validations

- Método ≠ GET → 405 `METHOD_NOT_ALLOWED`
- `x-admin-password` ausente ou incorreto → 401 `UNAUTHORIZED`
- Config ativa (`ativo=true`) não encontrada → 404 `NOT_FOUND`

## Behavior

1. Valida `x-admin-password`
2. Busca `omie_nfse_config` com `ativo=true` via `.single()`
3. Normaliza `departamentos_codigos`:
   - Se campo `departamentos_codigos` for string não vazia: usa diretamente
   - Caso contrário: extrai de `departamento_payload` (array de objetos com `cCodDepto`/`codigo` ou strings/numbers), join por vírgula, deduplicado
4. Retorna config completa com `departamentos_codigos` normalizado

## External Dependencies

- **Supabase**: `omie_nfse_config`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | `x-admin-password` inválido |
| 404 | `NOT_FOUND` | Config ativa não encontrada |
| 405 | `METHOD_NOT_ALLOWED` | Método não GET |
| 500 | `CONFIG_ERROR` | `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` ausentes |
| 500 | `INTERNAL_ERROR` | Erro não tratado |

## Observability

Sem logs estruturados. Erros retornam `details` com mensagem do Supabase.

## Examples

```
GET /functions/v1/get-omie-nfse-config
x-admin-password: megazord

// Response 200
{
  "success": true,
  "config": {
    "id": "uuid",
    "ativo": true,
    "codigo_servico_municipal": "123",
    "codigo_lc116": "14.01",
    "tipo_tributacao": "T1",
    "aliquota_iss": 5.0,
    "retencao_iss": "N",
    "aliquota_ir": 0,
    "retencao_ir": "N",
    "aliquota_inss": 0,
    "retencao_inss": "N",
    "aliquota_pis": 0,
    "retencao_pis": "N",
    "aliquota_cofins": 0,
    "retencao_cofins": "N",
    "aliquota_csll": 0,
    "retencao_csll": "N",
    "departamentos_codigos": "DEP01,DEP02",
    "os_etapa": "50",
    "descricao_servico_template": "Proposta n. {{numero_proposta}}..."
  }
}
```
