# suggest-briefing-seed

## Proposito

Gera uma sugestao de texto de briefing (seed) para revisao e edicao pelo cliente antes de usar em geracao de campanha. A funcao utiliza Perplexity para produzir um texto estruturado, mnimo de 120 caracteres, sem placeholders nao resolvidos. E uma etapa de pre-producao opcionalmente chainada antes de generate-campaign-briefing.

## Metodo / Acesso

- **HTTP Method**: POST
- **Autenticacao**: Publica (--no-verify-jwt)
- **Deploy**: `supabase functions deploy suggest-briefing-seed --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

## Input

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `company_name` | string | Sim | Tamanho: 2-120 caracteres |
| `company_site` | string | Sim | URL HTTP/HTTPS valida |
| `celebrity_name` | string | Sim | Tamanho: 2-120 caracteres |
| `sources` | array[string] (opcional) | Nao | Array de strings de fonte (filtro automatico de strings vazias) |
| `segment` | string (opcional) | Nao | Segmento da marca |
| `region` | string (opcional) | Nao | Regiao geografica |
| `campaign_goal_hint` | string (opcional) | Nao | Um de: `awareness`, `conversao`, `retencao` (ou null) |

### Exemplo de requisicao

```json
{
  "company_name": "Acelerai",
  "company_site": "https://acelerai.com",
  "celebrity_name": "Influencer XYZ",
  "sources": ["linkedin.com/company/acelerai", "instagram.com/acelerai"],
  "segment": "tecnologia",
  "region": "nacional",
  "campaign_goal_hint": "conversao"
}
```

## Output

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "data": {
    "text": "Briefing de campanha sugerido com minimo 120 caracteres, sem placeholders nao resolvidos, texto completo e estruturado...",
    "contract_version": "v1.0.0",
    "prompt_version": "v1.0.0",
    "strategy_version": "v1.0.0"
  }
}
```

### Erro (HTTP 400/422/500)

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
| `INVALID_INPUT` | 400 | Payload JSON invalido ou validacao de campo falhou (company_name fora de intervalo, company_site nao URL, celebrity_name fora de intervalo, etc) |
| `SUGGEST_GUARDRAIL_VIOLATION` | 422 | Guardrail de qualidade falhou: texto gerado < 120 caracteres OU contém placeholders nao resolvidos (${...}) |
| `PERPLEXITY_PROVIDER_ERROR` | 502 | Falha ao chamar API do Perplexity |
| `INTERNAL_ERROR` | 500 | Erro nao esperado |

## Fluxo

1. **CORS Check**: Validar OPTIONS ou retornar erro se metodo nao for POST
2. **Validate Input**: Validar company_name (2-120), company_site (URL valida), celebrity_name (2-120), sources (array strings ou undefined), segment/region/campaign_goal_hint (strings opcionais)
3. **Load DB Config**: Carregar `perplexity_config`
4. **Build Suggest Payload**: Construir payload usando `buildSuggestPayload()` com fields suggest_system_prompt e suggest_user_prompt_template
5. **Call Provider**: Chamar Perplexity com payload
6. **Extract Raw Content**: Extrair `choices[0].message.content` da resposta
7. **Normalize Suggest**: Validar guardrails com `normalizeSuggestResponse()`:
   - Tamanho: text >= 120 caracteres
   - Placeholders: nenhum ${...} nao resolvido deve constar no texto
8. **Return Success**: Retornar { success: true, data: { text, contract_version, prompt_version, strategy_version } }
9. **Error Handler**: Se SuggestError na normalizacao, mapear para SUGGEST_GUARDRAIL_VIOLATION 422

## Dependencias

### Modulos _shared

- `_shared/cors.ts` — `handleCors()`
- `_shared/perplexity/suggest.ts` — `buildSuggestPayload()`, `normalizeSuggestResponse()`, `SuggestError`, `SuggestInput`, `SuggestProviderConfig`
- `_shared/perplexity/client.ts` — `AppError`, `ProviderHttpError`, `callProvider`, `loadDbConfig`, `getConfiguredModel`, `createServiceClient`, `json`, `asNonEmptyString`, `isValidHttpUrl`

### Tabelas

- `perplexity_config` (select configuracao para suggest_system_prompt, suggest_user_prompt_template, suggest_prompt_version, suggest_strategy_version)

## Versionamento

- `contract_version`: Versao do contrato de entrada/saida (default: derivado de perplexity_config)
- `prompt_version`: Versao do suggest_user_prompt_template (field na perplexity_config)
- `strategy_version`: Versao da estrategia de sugestao (field na perplexity_config)

## Observacoes

### Deployment

- Funcao publica: usar `--no-verify-jwt`
- Nao requer autenticacao JWT

### Guardrails

- **Tamanho minimo**: 120 caracteres garante texto substantivo (nao fragmentos)
- **Placeholders**: e responsabilidade de `normalizeSuggestResponse()` validar que ${company_name}, ${company_site}, ${celebrity_name}, etc foram resolvidos no texto final
- SuggestError e lancado se guardrails falham, mapeado para 422 SUGGEST_GUARDRAIL_VIOLATION

### Use Case

- Cliente pode revisar texto sugerido antes de processar full briefing
- Permite iteracao rapida no copy/estrategia sem custos altos de geracao de campanha completa
- Seed suggestion pode ser editada manualmente e enviada como `briefing_input.text` para generate-campaign-briefing

### Config de Prompts

Utiliza dois prompts do perplexity_config:
- `suggest_system_prompt`: Instrucao de sistema para gerar sugestoes (default: prompt especializado em marketing)
- `suggest_user_prompt_template`: Template de user prompt com ${company_name}, ${company_site}, ${celebrity_name}, ${segment_line}, ${region_line}, ${goal_line}, ${sources_line}
