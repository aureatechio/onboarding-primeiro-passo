# Bloco 2 — Modulos Shared (Enrichment)

**Orquestrador**: `2026-04-08-onboarding-enrichment-master.md`
**Spec**: `supabase/functions/onboarding-enrichment/functionSpec.md`
**Dependencia**: Bloco 1 (config.ts precisa existir)

## Objetivo

Criar os 3 modulos reutilizaveis que as fases do pipeline consomem. Cada modulo e independente e testavel isoladamente.

## Tarefas

### T2.1 — `_shared/enrichment/color-extractor.ts`

**Arquivo**: `supabase/functions/_shared/enrichment/color-extractor.ts`

**Responsabilidades:**
- `extractColorsFromImage(imageBytes: Uint8Array, maxColors: number): string[]` — algoritmo de quantizacao (k-means simplificado ou median-cut) que retorna array de hex strings
- `extractColorsViaGemini(imageBytes: Uint8Array, mimeType: string, prompt: string, config: GeminiConfig): string[]` — envia imagem para Gemini Vision, parseia resposta como array JSON de hex strings
- `extractColorsFromCss(cssText: string, maxColors: number): string[]` — extrai cores de declaracoes CSS (variaveis custom, background-color, color)

**Contrato de retorno**: Sempre retorna `string[]` de hex colors (`#RRGGBB`). Array vazio se falha.

**Validacao de cores**: Cada cor retornada deve passar por regex `/^#[0-9a-fA-F]{6}$/`. Cores invalidas sao descartadas silenciosamente.

**Dependencias**:
- `_shared/enrichment/config.ts` — para parametros do Gemini e prompts
- `GEMINI_API_KEY` env var

**Testes**:
- Algoritmo retorna cores validas para imagem PNG de teste (fixture)
- Gemini mock retorna array JSON, funcao parseia corretamente
- Gemini mock retorna resposta malformada, funcao retorna array vazio
- CSS com variaveis custom, funcao extrai cores corretamente
- CSS sem cores, funcao retorna array vazio

### T2.2 — `_shared/enrichment/css-scraper.ts`

**Arquivo**: `supabase/functions/_shared/enrichment/css-scraper.ts`

**Responsabilidades:**
- `fetchAndParseCss(siteUrl: string, config: ScrapeConfig): CssAnalysis` — faz fetch da pagina principal, extrai:
  - Cores: variaveis CSS custom (`--brand-color`, etc.), propriedades `color`, `background-color` dos seletores de maior especificidade
  - Fontes: declaracoes `font-family` de `body`, `h1`-`h6`, seletores frequentes; filtra genericas (`sans-serif`, `serif`, `monospace`, `system-ui`, `inherit`)
- `extractFontsFromCss(cssText: string): FontAnalysis` — parse isolado de fontes (reutilizavel)
- `extractColorsFromCss(cssText: string): string[]` — delegado para `color-extractor.ts` ou duplicado simples

**Type `CssAnalysis`:**
```typescript
interface CssAnalysis {
  colors: string[]        // hex colors extraidas
  fonts: FontAnalysis
  fetchDurationMs: number
}

interface FontAnalysis {
  primary: string | null   // fonte mais frequente (excluindo genericas)
  all: string[]            // todas as fontes encontradas
  raw: string[]            // font-family declarations completas
}
```

**Config `ScrapeConfig`:**
```typescript
interface ScrapeConfig {
  timeoutMs: number   // de enrichment_config.scrape_timeout_ms
  userAgent: string   // de enrichment_config.scrape_user_agent
  maxRetries: number  // de enrichment_config.retry_scrape_max
  backoffMs: number[] // de enrichment_config.retry_scrape_backoff_ms (parseado)
}
```

**Regras de scraping:**
- Apenas GET da pagina principal (sem crawl)
- Timeout curto (default 5s)
- User-agent identificavel
- Extrair `<style>` inline e `<link rel="stylesheet">` (apenas 1o nivel, sem @import recursivo)
- Se resposta nao e HTML (content-type), retornar resultado vazio

**Testes:**
- Fetch de HTML com inline CSS, extrai cores e fontes
- Fetch de HTML com `<link>` externo, segue e extrai
- Timeout, retorna resultado vazio
- Site retorna 404, retorna resultado vazio
- CSS com Google Fonts (@import), extrai nome da fonte
- CSS com variaveis custom (`--primary: #384ffe`), extrai cor

### T2.3 — `_shared/enrichment/font-detector.ts`

**Arquivo**: `supabase/functions/_shared/enrichment/font-detector.ts`

**Responsabilidades:**
- `detectAndValidateFont(input: FontDetectionInput): FontDetectionResult` — orquestra a deteccao completa:
  1. Se `site_url` existe: chama `css-scraper.ts` para extrair fonte primaria
  2. Se fonte detectada: valida via Gemini usando `font_validation_prompt`
  3. Se nao aprovada: usa `suggestion` do Gemini como alternativa
  4. Se sem site ou scraping falhou: usa `font_suggestion_prompt` via Gemini
  5. Se tudo falhou: usa `font_fallback` da config

**Type `FontDetectionInput`:**
```typescript
interface FontDetectionInput {
  siteUrl: string | null
  companyName: string
  segment: string
  config: EnrichmentConfig
  geminiApiKey: string
}
```

**Type `FontDetectionResult`:**
```typescript
interface FontDetectionResult {
  font: string
  source: 'site_css' | 'gemini_suggestion' | 'fallback'
  validated: boolean
  validationReason: string | null
  attempts: AttemptLog[]
}
```

**Chamadas Gemini:**
- Usar `resolvePromptTemplate()` de `config.ts` para resolver variaveis
- Parsear resposta JSON do Gemini para `font_validation_prompt` (`{ approved, reason, suggestion }`)
- Parsear resposta texto puro do Gemini para `font_suggestion_prompt` (apenas nome da fonte)
- Retry automatico conforme `retry_gemini_max` e `retry_gemini_backoff_ms`

**Testes:**
- CSS retorna "Montserrat", Gemini aprova → source `site_css`, validated true
- CSS retorna "Comic Sans", Gemini rejeita com suggestion "Poppins" → font "Poppins", validated true
- Sem site_url, Gemini sugere "Roboto" → source `gemini_suggestion`
- Gemini falha em todas tentativas → source `fallback`, font "Inter"
- Retry: Gemini retorna 429, retry funciona na 2a tentativa

## Padrao de testes

Todos os testes usam mocks para chamadas externas (Gemini, fetch de sites). Fixtures de imagem/HTML/CSS em `supabase/functions/_shared/enrichment/__tests__/fixtures/`.

Comando: `deno test supabase/functions/_shared/enrichment/ --allow-env --allow-net --allow-read`

## Checklist de conclusao

- [x] `color-extractor.ts` criado com 3 metodos de extracao
- [x] `css-scraper.ts` criado com fetch + parse robusto
- [x] `font-detector.ts` criado com waterfall completo
- [x] Types exportados para consumo pelo orquestrador
- [x] Testes unitarios passando para os 3 modulos (39 testes, 0 falhas)
- [x] Nenhuma dependencia externa nao-mockavel nos testes

### Arquivos criados

- `_shared/enrichment/config-types.ts` — types, constantes e `resolvePromptTemplate()` (sem dep supabase-js)
- `_shared/enrichment/gemini-client.ts` — `callGeminiText()` com retry + `bytesToBase64()`
- `_shared/enrichment/color-extractor.ts` — `extractColorsFromImage()`, `extractColorsViaGemini()`, `extractColorsFromCss()`, `decodePngPixels()`
- `_shared/enrichment/css-scraper.ts` — `fetchAndParseCss()`, `extractFontsFromCss()`
- `_shared/enrichment/font-detector.ts` — `detectAndValidateFont()`
- `_shared/enrichment/gemini-client.test.ts` — 11 testes
- `_shared/enrichment/color-extractor.test.ts` — 12 testes
- `_shared/enrichment/css-scraper.test.ts` — 11 testes
- `_shared/enrichment/font-detector.test.ts` — 5 testes
- `_shared/enrichment/__tests__/fixtures/` — minimal.png, sample.html, sample.css, empty.html

### Decisao tecnica: config-types.ts

`config.ts` foi dividido em `config-types.ts` (types, constantes, `resolvePromptTemplate()` — sem import de `@supabase/supabase-js`) e `config.ts` (re-exporta tudo + loader com dep supabase). Isso permite que os modulos shared e seus testes importem tipos sem arrastar a dependencia de runtime do supabase-js.
