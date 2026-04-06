# generate-campaign-briefing

## Proposito

Gera um briefing estruturado de campanha de marketing com celebridade usando Perplexity Sonar. A funcao valida os dados de entrada, carrega configuracao do Perplexity, constroi o payload de prompt customizado, chama o provider, normaliza a resposta e persiste o resultado na tabela `onboarding_briefings`. O briefing gerado contem descricao detalhada, insights de pecas criativas e citacoes de fontes.

## Metodo / Acesso

- **HTTP Method**: POST
- **Autenticacao**: Publica (--no-verify-jwt)
- **Deploy**: `supabase functions deploy generate-campaign-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

## Input

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `compra_id` | UUID | Sim | Deve ser UUID valido (ex: `550e8400-e29b-41d4-a716-446655440000`) |
| `company_name` | string | Sim | Tamanho: 2-120 caracteres |
| `company_site` | string | Sim | URL HTTP/HTTPS valida (ex: `https://exemplo.com.br`) |
| `celebrity_name` | string | Sim | Tamanho: 2-120 caracteres |
| `context.segment` | string (opcional) | Nao | Segmento da marca (ex: `varejo`, `saude`) |
| `context.region` | string (opcional) | Nao | Regiao geografica (ex: `sudeste`, `nacional`) |
| `context.campaign_goal_hint` | enum (opcional) | Nao | Um de: `awareness`, `conversao`, `retencao` |
| `briefing_input.mode` | enum (opcional) | Nao | Um de: `text`, `audio`, `both` (default: `text`) |
| `briefing_input.text` | string (opcional) | Nao | Entrada manual de texto para o briefing (prioridade sobre modo) |

### Exemplo de requisicao

```json
{
  "compra_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_name": "Acelerai",
  "company_site": "https://acelerai.com",
  "celebrity_name": "Influencer XYZ",
  "context": {
    "segment": "tecnologia",
    "region": "sudeste",
    "campaign_goal_hint": "conversao"
  },
  "briefing_input": {
    "mode": "text"
  }
}
```

## Output

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "data": {
    "briefing": "Descricao estruturada do briefing da campanha...",
    "insights_pecas": [
      {
        "tipo": "video",
        "titulo": "Nome da peca",
        "descricao": "Descricao da peca criativa"
      }
    ],
    "citacoes": [
      {
        "titulo": "Fonte citada",
        "url": "https://exemplo.com"
      }
    ],
    "model": "sonar-pro",
    "prompt_version": "v1.0.0",
    "strategy_version": "v1.0.0",
    "contract_version": "v1.0.0"
  }
}
```

### Erro (HTTP 400/402/500)

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
| `INVALID_INPUT` | 400 | Payload JSON invalido ou validacao de campo falhou (compra_id nao UUID, company_name fora de intervalo, company_site nao URL, etc) |
| `PERPLEXITY_PROVIDER_ERROR` | 502 | Falha ao chamar API do Perplexity (erro de rede, timeout, resposta invalida) |
| `PERPLEXITY_TIMEOUT` | 504 | Timeout ao aguardar resposta do Perplexity (excedeu timeout_ms configurado) |
| `INVALID_PROVIDER_RESPONSE` | 502 | Resposta do Perplexity nao pôde ser normalizada (estrutura inesperada, campo ausente) |
| `INTERNAL_ERROR` | 500 | Erro nao esperado (falha ao persistir no banco, erro nao mapeado) |

## Fluxo

1. **CORS Check**: Validar OPTIONS ou retornar erro se metodo nao for POST
2. **Load DB Config**: Carregar configuracao do Perplexity da tabela `perplexity_config` ou usar defaults
3. **Validate Input**: Validar campos obrigatorios, tipos, intervalos e formatos
4. **Resolve Persist Mode**: Recuperar mode anterior da compra (se existir) ou usar fallback do input
5. **Persist Pending**: Insertar/atualizar registro em `onboarding_briefings` com status `pending`
6. **Build Payload**: Construir payload do Perplexity usando `buildPerplexityPayload()` com config
7. **Call Provider**: Chamar API do Perplexity e aguardar resposta
8. **Normalize Response**: Normalizar resposta usando `normalizeProviderResponse()`
9. **Persist Done**: Atualizar registro em `onboarding_briefings` com status `done` e dados persistidos
10. **Return Success**: Retornar { success: true, data: normalized }
11. **Error Handler**: Se erro em qualquer etapa, persistir status `error` com error_code e retornar erro mapeado

## Dependencias

### Modulos _shared

- `_shared/cors.ts` — `handleCors()`
- `_shared/perplexity/prompt.ts` — `buildPerplexityPayload()`
- `_shared/perplexity/normalize.ts` — `normalizeProviderResponse()`, `NormalizedData`, `ProviderResponse`
- `_shared/perplexity/client.ts` — `AppError`, `ProviderHttpError`, `callProvider`, `loadDbConfig`, `getConfiguredModel`, `createServiceClient`, `json`, `asNonEmptyString`, `isValidUuid`, `isValidHttpUrl`, `PerplexityDbConfig`

### Tabelas

- `onboarding_briefings` (upsert on compra_id)
  - Campos: compra_id, mode, briefing_json, citations_json, provider, provider_model, prompt_version, strategy_version, contract_version, status, error_code, updated_at
- `perplexity_config` (select configuracao)

## Versionamento

Versoes sao persistidas em cada registro gerado:
- `contract_version`: Versao do contrato de entrada/saida (default: `v1.0.0`)
- `prompt_version`: Versao do prompt system/user usado (default: `v1.0.0`)
- `strategy_version`: Versao da estrategia de extracao de insights (default: `v1.0.0`)

Quando configuracao e alterada na tabela `perplexity_config`, as novas versoes sao usadas nos proximos briefings gerados.

## Observacoes

### Deployment

- Funcao publica: usar `--no-verify-jwt`
- Sem autenticacao JWT necessaria
- Pode ser chamada diretamente do frontend

### Testes

- Handler exportado para injecao de dependencias: `export async function handleRequest(req, deps)`
- Permite mock de callProvider, persistBriefing, resolvePersistMode, now para testes unitarios

### Logging

- Registra eventos estruturados: `[briefing.request.received]`, `[briefing.provider.called]`, `[briefing.provider.succeeded]`, `[briefing.persist.succeeded]`, `[briefing.persist.failed]`, `[briefing.provider.failed]`
- Erros de provider sao registrados com status e body preview (primeiros 240 chars)

### Persistencia

- Upsert na compra_id garante idempotencia: chamada 2x com mesmo UUID resulta em 1 registro atualizado
- Mode anterior e mantido se existir; fallback para `text` se nao existir
- Citacoes sao armazenadas como array JSON normalizado na coluna citations_json
