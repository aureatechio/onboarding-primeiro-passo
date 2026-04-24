# update-perplexity-config

## Proposito

Atualiza configuracoes do Perplexity/Sonar de forma granular. Funcao permite editar model, endpoints, parametros de geracao, prompts, versoes e chave de API. Validacoes rígidas garantem que campos editaveis mantenhem consistencia. API key no corpo e mascarada na resposta. Protegida por JWT + RBAC admin.

## Metodo / Acesso

- **HTTP Method**: PATCH
- **Autenticacao**: JWT obrigatorio + Guard `requireRole(req, ["admin"])`
- **Deploy**: `supabase functions deploy update-perplexity-config --project-ref awqtzoefutnfmnbomujt`

## Input

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `model` | string | Nao | Nao vazio. Exemplo: `sonar-pro` |
| `api_base_url` | string | Nao | Deve comečar com `https://`. Exemplo: `https://api.perplexity.ai` |
| `api_key` | string ou null | Nao | Se string: >= 10 caracteres. Se null: limpa a chave armazenada |
| `timeout_ms` | integer | Nao | Intervalo: 1000-60000 (ms) |
| `temperature` | number | Nao | Intervalo: 0-2 (float) |
| `top_p` | number | Nao | Intervalo: 0-1 (float) |
| `search_mode` | string | Nao | Enum: `web` (apenas valor valido atualmente) |
| `search_recency_filter` | string | Nao | Enum: `hour`, `day`, `week`, `month`, `year` |
| `system_prompt` | string | Nao | Nao vazio. Instrucao de sistema para briefing |
| `user_prompt_template` | string | Nao | Nao vazio. Template de user prompt para briefing |
| `insights_count` | integer | Nao | Intervalo: 1-10 (int) |
| `prompt_version` | string | Nao | Nao vazio. Exemplo: `v1.0.0` |
| `strategy_version` | string | Nao | Nao vazio. Exemplo: `v1.0.0` |
| `contract_version` | string | Nao | Nao vazio. Exemplo: `v1.0.0` |
| `suggest_system_prompt` | string | Nao | >= 20 caracteres. Instrucao de sistema para sugestoes |
| `suggest_user_prompt_template` | string | Nao | Nao vazio e DEVE conter placeholders obrigatorios: `${company_name}`, `${company_site}`, `${celebrity_name}` |
| `suggest_prompt_version` | string | Nao | Nao vazio. Exemplo: `v1.0.0` |
| `suggest_strategy_version` | string | Nao | Nao vazio. Exemplo: `v1.0.0` |

### Exemplo de requisicao

```json
{
  "model": "sonar-pro",
  "temperature": 0.2,
  "top_p": 0.9,
  "insights_count": 5,
  "timeout_ms": 30000
}
```

Ou com atualizacoes de prompt:

```json
{
  "system_prompt": "Nova instrucao de sistema customizada...",
  "user_prompt_template": "Novo template com contexto...",
  "prompt_version": "v1.1.0"
}
```

## Output

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "config": {
    "model": "sonar-pro",
    "api_base_url": "https://api.perplexity.ai",
    "timeout_ms": 30000,
    "temperature": 0.2,
    "top_p": 0.9,
    "search_mode": "web",
    "search_recency_filter": "month",
    "system_prompt": "Prompt de sistema customizado...",
    "user_prompt_template": "Template de user prompt...",
    "insights_count": 5,
    "prompt_version": "v1.0.0",
    "strategy_version": "v1.0.0",
    "contract_version": "v1.0.0",
    "suggest_system_prompt": "Prompt de sistema para sugestoes...",
    "suggest_user_prompt_template": "Template de user prompt para sugestoes...",
    "suggest_prompt_version": "v1.0.0",
    "suggest_strategy_version": "v1.0.0",
    "api_key_hint": "****abcd",
    "api_key_source": "database",
    "updated_at": "2026-04-06T10:30:00Z"
  }
}
```

### Erro (HTTP 400/404/500)

```json
{
  "error": "Descricao do erro",
  "code": "ERROR_CODE"
}
```

## Error Codes

| Codigo | HTTP | Descricao |
|--------|------|-----------|
| `UNAUTHORIZED` | 401 | JWT ausente ou invalido |
| `FORBIDDEN` | 403 | Role diferente de `admin` |
| `INVALID_JSON` | 400 | JSON no body e invalido |
| `VALIDATION_ERROR` | 400 | Campo falhou validacao (vazio quando nao permite, tipo errado, intervalo invalido, enum invalido, etc) |
| `NO_VALID_FIELDS` | 400 | Nenhum campo valido foi fornecido para atualizar |
| `NOT_FOUND` | 404 | Nenhum registro de configuracao encontrado na tabela |
| `METHOD_NOT_ALLOWED` | 405 | Metodo HTTP nao suportado (deve ser PATCH) |
| `ERROR` (generico) | 500 | Erro ao atualizar tabela |

## Fluxo

1. **CORS Check**: Responder OPTIONS com headers CORS
2. **Method Validation**: Se nao PATCH, retornar 405
3. **Auth Guard**: Validar JWT e role admin via `requireRole()`; se invalido, retornar 401/403
4. **Parse JSON**: Tentar fazer parse do body JSON; se invalido, retornar 400 INVALID_JSON
4. **Validate Each Field**:
   - `model`: Se defined, nao-vazio
   - `api_base_url`: Se defined, deve comečar com `https://`
   - `api_key`: Se defined, se vazio coloca null, se nao-vazio >= 10 chars
   - `timeout_ms`: Se defined, inteiro 1000-60000
   - `temperature`: Se defined, numero 0-2
   - `top_p`: Se defined, numero 0-1
   - `search_mode`: Se defined, deve estar em [web]
   - `search_recency_filter`: Se defined, deve estar em [hour,day,week,month,year]
   - `system_prompt`: Se defined, nao-vazio
   - `user_prompt_template`: Se defined, nao-vazio
   - `insights_count`: Se defined, inteiro 1-10
   - `prompt_version`: Se defined, nao-vazio
   - `strategy_version`: Se defined, nao-vazio
   - `contract_version`: Se defined, nao-vazio
   - `suggest_system_prompt`: Se defined, >= 20 caracteres
   - `suggest_user_prompt_template`: Se defined, nao-vazio E contem todos os placeholders obrigatorios: ${company_name}, ${company_site}, ${celebrity_name}
   - `suggest_prompt_version`: Se defined, nao-vazio
   - `suggest_strategy_version`: Se defined, nao-vazio
5. **Build Update Payload**: Montar objeto com campos validados
6. **Check Not Empty**: Se nenhum campo valido, retornar 400 NO_VALID_FIELDS
7. **Add Timestamp**: Adicionar `updated_at` com ISO timestamp
8. **Fetch Existing**: Query tabela para obter ID do registro existente (limit 1)
9. **Check Exists**: Se nao encontra registro, retornar 404 NOT_FOUND
10. **Update DB**: UPDATE registro com payload validado e novo timestamp
11. **Mask API Key**: Mascarar api_key na resposta (ultimos 4 chars)
12. **Detect Source**: Verificar se api_key vem de database ou env var
13. **Return 200**: Retornar { success: true, config: {...} }
14. **Error Handler**: Se erro no update, retornar 500

## Dependencias

### Modulos _shared

- `_shared/rbac.ts` — `requireRole`
- `jsr:@supabase/supabase-js@2` — `createClient`

### Tabelas

- `perplexity_config` (update unico registro, select para validar existencia)

## Observacoes

### Deployment

- Funcao protegida: nao usar `--no-verify-jwt`
- **Seguranca**: Protegida por JWT + RBAC admin.
- CORS habilitado para headers de autenticacao Supabase.

### Validacoes Criticas

- **suggest_user_prompt_template** MUST conter tokens obrigatorios: ${company_name}, ${company_site}, ${celebrity_name}
- Falta desses tokens causa erro VALIDATION_ERROR 400
- Isso garante que sugestoes contenham contexto minimo necessario

### API Key Handling

- Se api_key fornecido, substituido na tabela (nao append)
- Se api_key = null, coloca null na tabela (limpa a chave)
- Se api_key = "", converte para null (limpa)
- Se api_key < 10 chars (e nao-vazio), retorna erro
- Na resposta, mascarado como `****XXXX` (ultimos 4 chars)

### Idempotencia

- Multiplas chamadas com mesmo payload atualizam tabela com mesmo resultado
- Timestamp `updated_at` muda a cada chamada (nao idempotente em timestamp)

### Auditoria

- Cada update registra novo `updated_at`
- Protecao admin-password impede alteracoes nao autorizadas

### Use Cases

1. Admin configura Perplexity na primeira vez (create inicial nao fazer parte desta funcao)
2. Ajustar temperature/top_p para tuning de qualidade
3. Atualizar prompts system/user com novas estrategias (nova prompt_version)
4. Trocar API key quando necessario rotacao seguranca
5. Configurar insights_count ou timeout_ms para otimizar custo/latencia
