# discover-company-sources

## Proposito

Descobre e retorna perfis digitais oficiais de uma empresa usando Perplexity. Tenta localizar site corporativo, perfil Instagram, LinkedIn, Facebook e outras fontes publicas relevantes. Retorna urls e nivel de confianca (high, medium, low) baseado em validacao de descoberta.

## Metodo / Acesso

- **HTTP Method**: POST
- **Autenticacao**: Publica (--no-verify-jwt)
- **Deploy**: `supabase functions deploy discover-company-sources --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

## Input

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `company_name` | string | Sim | Tamanho: 2-120 caracteres |
| `company_site` | string (opcional) | Nao | URL HTTP/HTTPS valida (hint para busca, nao obrigatorio) |

### Exemplo de requisicao

```json
{
  "company_name": "Acelerai",
  "company_site": "https://acelerai.com"
}
```

Ou sem site hint:

```json
{
  "company_name": "Acelerai"
}
```

## Output

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "data": {
    "company_site": "https://acelerai.com",
    "instagram": "https://instagram.com/acelerai",
    "linkedin": "https://linkedin.com/company/acelerai",
    "facebook": "https://facebook.com/acelerai",
    "other_sources": [
      "https://youtube.com/channel/acelerai",
      "https://twitter.com/acelerai"
    ],
    "confidence": "high"
  }
}
```

### Erro (HTTP 400/500)

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
| `INVALID_INPUT` | 400 | company_name fora de intervalo (< 2 ou > 120 caracteres) OU company_site fornecido mas nao e URL HTTP/HTTPS valida |
| `PERPLEXITY_PROVIDER_ERROR` | 502 | Falha ao chamar API do Perplexity |
| `INVALID_PROVIDER_RESPONSE` | 502 | Resposta do Perplexity nao pode ser normalizada (campo ausente ou estrutura invalida) |
| `INTERNAL_ERROR` | 500 | Erro nao esperado |
| `METHOD_NOT_ALLOWED` | 405 | Metodo HTTP nao suportado (deve ser POST) |

## Fluxo

1. **CORS Check**: Validar OPTIONS ou retornar erro se metodo nao for POST
2. **Validate Input**:
   - company_name: validar tamanho 2-120
   - company_site: se fornecido e nao-vazio, validar URL HTTP/HTTPS; se vazio ou invalido, usar null
3. **Load DB Config**: Carregar `perplexity_config`
4. **Build Discover Payload**: Construir payload usando `buildDiscoverPayload()` com DiscoverProviderConfig
5. **Call Provider**: Chamar Perplexity com payload
6. **Extract Raw Content**: Extrair `choices[0].message.content` da resposta
7. **Normalize Discover**: Parsear resposta e normalizar usando `normalizeDiscoverResponse()`
8. **Return Success**: Retornar { success: true, data: DiscoverResult }
9. **Error Handler**: Se erro, mapear (ProviderHttpError → PERPLEXITY_PROVIDER_ERROR 502, etc)

## Dependencias

### Modulos _shared

- `_shared/cors.ts` — `handleCors()`
- `_shared/perplexity/discover.ts` — `buildDiscoverPayload()`, `normalizeDiscoverResponse()`, `DiscoverInput`, `DiscoverProviderConfig`
- `_shared/perplexity/client.ts` — `AppError`, `callProvider`, `loadDbConfig`, `getConfiguredModel`, `createServiceClient`, `mapError`, `json`, `asNonEmptyString`, `isValidHttpUrl`

### Tabelas

- `perplexity_config` (select configuracao para model, api_base_url, api_key, timeout_ms, temperature, top_p, search_mode, search_recency_filter)

## Versionamento

Nao persiste versionamento (resultado ephemeral). A descoberta usa versao do Perplexity ativa no momento da chamada.

## Observacoes

### Deployment

- Funcao publica: usar `--no-verify-jwt`
- Nao requer autenticacao JWT

### Config Defaults

No DiscoverProviderConfig:
- `temperature`: 0.1 (baixo: respostas determinisicas, focadas)
- `search_recency_filter`: 'year' (buscar info de ate 1 ano atras, balanco entre recencia e completude)
- `search_mode`: 'web' (busca na web)

### Uso

- Funcao de descoberta publica e pode ser chamada durante onboarding para auto-completar perfis digitais
- Cliente pode revisar e ajustar resultado antes de usar
- Resultado pode ser cacheado por compra se necessario

### Confidence Levels

- **high**: Todos os campos principais (site, instagram, linkedin, facebook) foram encontrados
- **medium**: Alguns campos principais encontrados, outros podem estar ausentes
- **low**: Poucos campos encontrados, resultado pode ser incompleto ou especulativo

### No Persist

- Resultado nao e persistido em tabela (ao contrario de briefing ou test_runs)
- E endpoint ephemeral, util para UI autocomplete ou pre-filling forms
