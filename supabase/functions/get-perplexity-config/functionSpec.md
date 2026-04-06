# get-perplexity-config

## Proposito

Retorna a configuracao completa do Perplexity/Sonar para consumo por funcoes de geracao de briefing, sugestoes e descoberta de fontes. Inclui model, endpoints, parametros de geracap, versoes de prompts e estrategias. API key e mascarada (ultimos 4 caracteres) por seguranca. Funcao publica (sem autenticacao).

## Metodo / Acesso

- **HTTP Method**: GET
- **Autenticacao**: Publica (--no-verify-jwt)
- **Deploy**: `supabase functions deploy get-perplexity-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

## Input

Nenhum (GET sem parametros ou body).

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
    "suggest_user_prompt_template": "Template de user prompt para sugestoes com ${company_name}...",
    "suggest_prompt_version": "v1.0.0",
    "suggest_strategy_version": "v1.0.0",
    "api_key_hint": "****abcd",
    "api_key_source": "database",
    "updated_at": "2026-04-06T10:30:00Z"
  }
}
```

### Erro (HTTP 404/500)

```json
{
  "error": "Descricao do erro",
  "details": "Detalhes tecnicos (opcional)"
}
```

## Error Codes

Responde com HTTP status diretamente (nao usa "code" como outras funcoes):

| HTTP | Descricao |
|------|-----------|
| 200 | Sucesso: configuracao encontrada e retornada |
| 405 | Metodo nao permitido (deve ser GET) |
| 500 | Erro ao buscar configuracao do banco ou erro interno |

## Fluxo

1. **CORS Check**: Responder OPTIONS com headers CORS
2. **Method Validation**: Se nao GET, retornar 405 METHOD_NOT_ALLOWED
3. **Load Config**: Query tabela `perplexity_config`, limit 1, single row
4. **Mask API Key**: Aplicar mascara ao api_key se existir (${...}xxxx${ultimos_4})
5. **Detect API Key Source**: Verificar se api_key vem de database OU env var PERPLEXITY_API_KEY (prioridade: database > env)
6. **Build Response**: Combinar dados do DB com defaults e env var hints
7. **Return 200**: Retornar { success: true, config: {...} }
8. **Error Handler**: Se erro ao query, retornar 500 com mensagem de erro

## Dependencias

### Modulos _shared

- `jsr:@supabase/supabase-js@2` — `createClient`

### Tabelas

- `perplexity_config` (select unico registro)

## Versionamento

Retorna 4 versoes versionadas:
- `contract_version`: Versao do contrato de entrada/saida (default: v1.0.0)
- `prompt_version`: Versao do user_prompt_template para briefings (default: v1.0.0)
- `strategy_version`: Versao da estrategia de extracao de insights (default: v1.0.0)
- `suggest_prompt_version`: Versao do suggest_user_prompt_template (default: v1.0.0)
- `suggest_strategy_version`: Versao da estrategia de sugestao (default: v1.0.0)

## Defaults

Quando campo nao existe ou e null na tabela, retorna default:

| Campo | Default |
|-------|---------|
| `model` | `sonar-pro` |
| `api_base_url` | `https://api.perplexity.ai` |
| `timeout_ms` | `30000` |
| `temperature` | `0.2` |
| `top_p` | `0.9` |
| `search_mode` | `web` |
| `search_recency_filter` | `month` |
| `system_prompt` | `""` (vazio) |
| `user_prompt_template` | `""` (vazio) |
| `insights_count` | `5` |
| `prompt_version` | `1.0.0` |
| `strategy_version` | `1.0.0` |
| `contract_version` | `1.0.0` |
| `suggest_system_prompt` | DEFAULT_SUGGEST_SYSTEM_PROMPT (string literal hardcoded na funcao) |
| `suggest_user_prompt_template` | DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE (string literal hardcoded na funcao) |
| `suggest_prompt_version` | `v1.0.0` |
| `suggest_strategy_version` | `v1.0.0` |

## Observacoes

### Deployment

- Funcao publica: usar `--no-verify-jwt`
- Nao requer autenticacao JWT
- CORS habilitado para todas as origens

### API Key Security

- API key e NUNCA retornada em texto completo
- Se armazenada em database (perplexity_config.api_key), retorna hint: `****XXXX` (ultimos 4 caracteres)
- Se apenas env var (PERPLEXITY_API_KEY), retorna api_key_hint: null
- api_key_source indica origem: `database`, `env_var`, ou `none`

### Use Cases

- Outras funcoes (generate-campaign-briefing, test-perplexity-briefing, suggest-briefing-seed, discover-company-sources) chamam esta para configuracao
- Frontend pode chamar para exibir status de configuracao (debug, admin UI)
- Util para health checks: verificar se config e valida

### Caching

- Resposta e geralmente stavel (config muda raramente)
- Frontend pode cachear resultado por sessao ou long-lived TTL
- Se config alterada via update-perplexity-config, proximas chamadas retornam config nova

### Hardcoded Defaults

Dois prompts defaults sao hardcoded na funcao:
- DEFAULT_SUGGEST_SYSTEM_PROMPT: Instrucao especializada em marketing com celebridades
- DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE: Template com placeholders para contexto
