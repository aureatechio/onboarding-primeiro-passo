# test-perplexity-briefing

## Proposito

Funcao sandbox para testar e iterar a geracao de briefings Perplexity sem impactar os dados de producao. Oferece dois endpoints: GET para listar historico de testes de uma compra, e POST para executar um novo teste. Testes sao persistidos em `perplexity_test_runs` com entrada, saida, duracao e status.

## Metodo / Acesso

- **HTTP Methods**: GET, POST
- **Autenticacao**: Publica (--no-verify-jwt)
- **Deploy**: `supabase functions deploy test-perplexity-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

## Input

### GET (List Test Runs)

| Parametro | Tipo | Obrigatorio | Validacao |
|-----------|------|-------------|-----------|
| `compra_id` | UUID (query string) | Sim | UUID valido |
| `limit` | integer (query string) | Nao | Intervalo: 1-50 (default: 10) |

### POST (Execute Test)

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `compra_id` | UUID | Sim | UUID valido |
| `company_name` | string | Sim | Tamanho: 2-120 caracteres |
| `company_site` | string | Sim | URL HTTP/HTTPS valida |
| `celebrity_name` | string | Sim | Tamanho: 2-120 caracteres |
| `context.segment` | string (opcional) | Nao | Segmento da marca |
| `context.region` | string (opcional) | Nao | Regiao geografica |
| `context.campaign_goal_hint` | enum (opcional) | Nao | Um de: `awareness`, `conversao`, `retencao` |
| `briefing_input.mode` | enum (opcional) | Nao | Um de: `text`, `audio`, `both` (default: `text`) |
| `briefing_input.text` | string (opcional) | Nao | Entrada manual de texto |

### Exemplos

**GET**:
```
GET /test-perplexity-briefing?compra_id=550e8400-e29b-41d4-a716-446655440000&limit=20
```

**POST**:
```json
{
  "compra_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_name": "Acelerai",
  "company_site": "https://acelerai.com",
  "celebrity_name": "Influencer XYZ",
  "context": {
    "segment": "tecnologia"
  }
}
```

## Output

### GET - Sucesso (HTTP 200)

```json
{
  "success": true,
  "runs": [
    {
      "id": "uuid-do-teste",
      "compra_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "done",
      "error_code": null,
      "provider_model": "sonar-pro",
      "prompt_version": "v1.0.0",
      "strategy_version": "v1.0.0",
      "contract_version": "v1.0.0",
      "duration_ms": 3250,
      "created_at": "2026-04-06T10:30:00Z"
    }
  ]
}
```

### POST - Sucesso (HTTP 200)

```json
{
  "success": true,
  "run_id": "uuid-do-teste-criado",
  "duration_ms": 3250,
  "data": {
    "briefing": "Descricao estruturada do briefing...",
    "insights_pecas": [...],
    "citacoes": [...],
    "model": "sonar-pro",
    "prompt_version": "v1.0.0",
    "strategy_version": "v1.0.0",
    "contract_version": "v1.0.0"
  }
}
```

### GET - Erro (HTTP 400/500)

```json
{
  "success": false,
  "code": "INVALID_INPUT",
  "message": "compra_id deve ser UUID valido."
}
```

### POST - Erro (HTTP 400/402/500)

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Descricao do erro"
}
```

## Error Codes

| Codigo | HTTP | Descricao |
|--------|------|-----------|
| `INVALID_INPUT` | 400 | Payload invalido ou validacao de campo falhou |
| `PERPLEXITY_PROVIDER_ERROR` | 502 | Falha ao chamar API do Perplexity |
| `INVALID_PROVIDER_RESPONSE` | 502 | Resposta do Perplexity nao pode ser normalizada (inclui NormalizeError) |
| `INTERNAL_ERROR` | 500 | Erro nao esperado ou falha ao persistir |
| `METHOD_NOT_ALLOWED` | 405 | Metodo HTTP nao suportado (deve ser GET ou POST) |

## Fluxo

### GET (List Test Runs)

1. Validar CORS
2. Extrair e validar `compra_id` e `limit` de query params
3. Se `compra_id` nao valido, retornar 400
4. Limitar `limit` entre 1 e 50
5. Query tabela `perplexity_test_runs` filtrando por compra_id, ordered by created_at DESC, limit N
6. Retornar array de runs com campos: id, compra_id, status, error_code, provider_model, prompt_version, strategy_version, contract_version, duration_ms, created_at
7. Se erro ao query, retornar 500

### POST (Execute Test)

1. Validar CORS
2. Carregar config do Perplexity da tabela `perplexity_config` ou usar defaults
3. Validar input (mesmo que generate-campaign-briefing)
4. Construir payload Perplexity usando `buildPerplexityPayload()`
5. Chamar `callProvider()` com payload
6. Normalizar resposta usando `normalizeProviderResponse()`
7. Persistir teste em `perplexity_test_runs` com input_json, output_json, status `done`
8. Retornar run_id, duration_ms e data normalizada
9. Se erro em qualquer etapa, persistir com status `error` e error_code/message, retornar erro mapeado

## Dependencias

### Modulos _shared

- `_shared/cors.ts` — `handleCors()`
- `_shared/perplexity/prompt.ts` — `buildPerplexityPayload()`
- `_shared/perplexity/normalize.ts` — `normalizeProviderResponse()`, `NormalizeError`
- `_shared/perplexity/client.ts` — `AppError`, `ProviderHttpError`, `callProvider`, `loadDbConfig`, `getConfiguredModel`, `createServiceClient`, `json`, `asNonEmptyString`, `isValidUuid`, `isValidHttpUrl`

### Tabelas

- `perplexity_test_runs` (insert com teste)
  - Campos: compra_id, input_json, output_json, status, error_code, error_message, provider_model, prompt_version, strategy_version, contract_version, duration_ms, created_at
- `perplexity_config` (select configuracao)

## Versionamento

Mesmo que generate-campaign-briefing:
- `contract_version`: Versao do contrato (default: `v1.0.0`)
- `prompt_version`: Versao do prompt (default: `v1.0.0`)
- `strategy_version`: Versao da estrategia (default: `v1.0.0`)

## Observacoes

### Deployment

- Funcao publica: usar `--no-verify-jwt`
- Nao requer autenticacao JWT

### Testes e Debugging

- GET lista historico para revisar testes anteriores de uma campanha
- POST permite experimentar novos prompts, configs ou inputs sem afetar `onboarding_briefings`
- Util para A/B testing de prompts, iteracao rapida em strategy_version, etc

### Persistencia

- `perplexity_test_runs` e tabela de sandbox, nao afeta fluxo de producao
- Entrada e saida sao armazenadas como JSON full para auditoria
- error_message contem descricao do erro (util para debugging)
- Limite de 50 runs por query para performance

### Error Mapping

- NormalizeError (do _shared/perplexity/normalize.ts) e mapeado para INVALID_PROVIDER_RESPONSE 502
- Mesmo error handling que generate-campaign-briefing, mas testes nao bloqueiam producao
