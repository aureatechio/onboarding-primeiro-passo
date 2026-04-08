# functionSpec: onboarding-enrichment

## Objetivo

Pipeline automatico de enriquecimento pos-onboarding. Quando o cliente salva sua identidade visual (logo, site, Instagram), esta funcao orquestra a extracao de cores e fonte, a geracao de briefing via Perplexity, e o disparo do job de criacao de criativos IA — sem intervencao manual.

Substitui o fluxo anterior onde o cliente preenchia briefing manualmente (Etapa 7 / `production_path: hybrid`). Agora **todo onboarding segue um unico caminho automatizado**.

---

## Entradas

### Autenticacao

- Interna (service role) — chamada exclusivamente por `save-onboarding-identity` via bearer service role
- Deploy: `--no-verify-jwt`

### Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `GEMINI_API_KEY` | Sim | API key para Gemini (analise de logo e validacao de fonte) |

Variaveis de modelo Gemini (`GEMINI_MODEL_NAME`, `GEMINI_API_BASE_URL`) sao fallback. O pipeline prioriza valores da tabela `enrichment_config`.

### Requisicao

- Metodo: POST
- Content-Type: application/json

### Campos (Body)

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `compra_id` | UUID | Sim | UUID valido, deve existir em `compras` |
| `retry_from_phase` | string | Nao | Um de: `colors`, `font`, `briefing`, `campaign`. Se ausente, executa pipeline completo. |

### Exemplo de requisicao

Pipeline completo:

```json
{
  "compra_id": "4faf2ce6-8167-4289-9d44-58cd894f84d3"
}
```

Retry a partir de uma fase especifica:

```json
{
  "compra_id": "4faf2ce6-8167-4289-9d44-58cd894f84d3",
  "retry_from_phase": "briefing"
}
```

---

## Contexto: Dados coletados no frontend (Etapa 6.2)

O frontend (`Etapa62.jsx`) coleta e salva via `save-onboarding-identity`:

| Campo frontend | Armazenamento DB | Obrigatorio no frontend |
|----------------|------------------|------------------------|
| Logo (arquivo) | `onboarding_identity.logo_path` (bucket `onboarding-identity`) | Nao (opcional) |
| Site URL | `onboarding_identity.site_url` (**nova coluna**) | Nao (opcional) |
| Instagram handle | `onboarding_identity.instagram_handle` (**nova coluna**) | Nao (opcional) |

**Condicao de disparo**: O pipeline so e disparado se `site_url` OU `instagram_handle` estiverem preenchidos. Se o cliente escolheu `choice: "later"` ou nao preencheu nenhum dos dois, o pipeline NAO e disparado.

---

## Alteracoes de Schema Necessarias

### Migration: `onboarding_identity`

```sql
ALTER TABLE onboarding_identity
  ADD COLUMN site_url text,
  ADD COLUMN instagram_handle text;

COMMENT ON COLUMN onboarding_identity.site_url IS 'URL do site da empresa (https://...)';
COMMENT ON COLUMN onboarding_identity.instagram_handle IS 'Handle do Instagram sem @ (ex: emporiofitness)';
```

### Nova tabela: `onboarding_enrichment_jobs`

```sql
CREATE TABLE onboarding_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,

  -- Status global do job (mesmo padrao de ai_campaign_jobs)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')),

  -- Status individual por fase
  phase_colors_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_colors_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_font_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_font_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_briefing_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_briefing_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  phase_campaign_status text NOT NULL DEFAULT 'pending'
    CHECK (phase_campaign_status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),

  -- Resultados da Fase 1 (Cores)
  extracted_palette text[],
  extracted_palette_source text
    CHECK (extracted_palette_source IS NULL
      OR extracted_palette_source IN ('logo_algorithm', 'logo_gemini', 'site_css', 'fallback')),

  -- Resultados da Fase 2 (Fonte)
  detected_font text,
  detected_font_source text
    CHECK (detected_font_source IS NULL
      OR detected_font_source IN ('site_css', 'gemini_suggestion', 'fallback')),
  font_validated boolean DEFAULT false,
  font_validation_reason text,

  -- Resultados da Fase 3 (Briefing)
  briefing_generated boolean DEFAULT false,

  -- Resultados da Fase 4 (Campanha)
  campaign_job_id uuid REFERENCES ai_campaign_jobs(id),

  -- Diagnostico
  error_phase text,
  error_message text,
  phases_log jsonb NOT NULL DEFAULT '[]',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_enrichment_jobs_compra
  ON onboarding_enrichment_jobs (compra_id);
```

A constraint UNIQUE em `compra_id` garante que existe no maximo 1 job de enriquecimento por compra. Reexecucoes fazem upsert (substituem o job anterior).

### Nova tabela: `enrichment_config` (singleton)

Centraliza todos os prompts, parametros e timeouts do pipeline. Editavel via endpoint `update-enrichment-config` sem redeploy. Segue o mesmo padrao de `perplexity_config` e `nanobanana_config`.

```sql
CREATE TABLE enrichment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fase 1: Cores
  color_gemini_prompt text NOT NULL
    DEFAULT 'Analise este logo e retorne as 3-5 cores primarias da marca em formato hex (#RRGGBB). Retorne APENAS um array JSON de strings hex, sem explicacao.',
  color_fallback_palette text[] NOT NULL DEFAULT '{"#384ffe","#1a1a2e","#f5f5f5"}',
  color_extraction_max integer NOT NULL DEFAULT 5,

  -- Fase 2: Fonte
  font_validation_prompt text NOT NULL
    DEFAULT 'Voce e um diretor de arte senior especializado em publicidade. A empresa ''${company_name}'' do segmento ''${segment}'' usa a fonte ''${detected_font}''. Essa fonte e adequada para material publicitario profissional? Responda SOMENTE em JSON valido: { "approved": boolean, "reason": "string", "suggestion": "string ou null" }',
  font_suggestion_prompt text NOT NULL
    DEFAULT 'Voce e um diretor de arte senior. Sugira UMA fonte profissional para material publicitario da empresa ''${company_name}'' do segmento ''${segment}''. Responda SOMENTE o nome da fonte, sem explicacao.',
  font_fallback text NOT NULL DEFAULT 'Inter',

  -- Fase 3: Briefing
  briefing_auto_mode text NOT NULL DEFAULT 'text',

  -- Modelo Gemini (usado nas fases 1 e 2)
  gemini_model_name text NOT NULL DEFAULT 'gemini-2.0-flash',
  gemini_api_base_url text NOT NULL DEFAULT 'https://generativelanguage.googleapis.com/v1beta',
  gemini_temperature numeric NOT NULL DEFAULT 0.2,

  -- Timeouts por fase (ms)
  timeout_colors_ms integer NOT NULL DEFAULT 10000,
  timeout_font_ms integer NOT NULL DEFAULT 15000,
  timeout_briefing_ms integer NOT NULL DEFAULT 30000,
  timeout_campaign_ms integer NOT NULL DEFAULT 10000,

  -- Retry automatico intra-fase
  retry_gemini_max integer NOT NULL DEFAULT 2,
  retry_gemini_backoff_ms text NOT NULL DEFAULT '1000,3000',
  retry_scrape_max integer NOT NULL DEFAULT 1,
  retry_scrape_backoff_ms text NOT NULL DEFAULT '2000',

  -- Scraping
  scrape_timeout_ms integer NOT NULL DEFAULT 5000,
  scrape_user_agent text NOT NULL DEFAULT 'AceleraiBot/1.0 (+https://acelerai.com)',

  -- Metadata
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir registro default (singleton)
INSERT INTO enrichment_config (id) VALUES (gen_random_uuid());
```

**Template variables disponiveis nos prompts:**

| Variavel | Resolvida para |
|----------|----------------|
| `${company_name}` | Nome da empresa (`clientes.nome` ou `nome_fantasia`) |
| `${segment}` | Segmento (`segmentos.nome`) |
| `${detected_font}` | Fonte detectada pelo CSS scraping (so disponivel em `font_validation_prompt`) |

---

## Validacoes

1. Metodo != POST → 405 `METHOD_NOT_ALLOWED`
2. Auth != service role → 401 `UNAUTHORIZED`
3. `compra_id` ausente ou invalido → 400 `INVALID_COMPRA_ID`
4. `retry_from_phase` presente mas valor invalido → 400 `INVALID_RETRY_PHASE`
5. Compra nao encontrada → 404 `COMPRA_NOT_FOUND`
6. Compra nao elegivel (checkout_status != 'pago' OU clicksign_status != 'Assinado') → 409 `NOT_ELIGIBLE`
7. Identity nao encontrada para a compra → 422 `IDENTITY_NOT_FOUND`
8. Nem `site_url` nem `instagram_handle` preenchidos na identity → 422 `INSUFFICIENT_DATA`
9. `retry_from_phase` informado mas nao existe job anterior para esta compra → 409 `NO_EXISTING_JOB`

---

## Comportamento

### Fase sincrona (resposta imediata)

1. Valida metodo, auth e payload.
2. Carrega `enrichment_config` (singleton, com cache TTL de 5 minutos — mesmo padrao de `perplexity_config`).
3. Busca `compras` e verifica elegibilidade (pago + assinado).
4. Busca `onboarding_identity` da compra.
5. Verifica se `site_url` ou `instagram_handle` estao preenchidos.
6. Se `retry_from_phase` informado:
   - Busca job existente em `onboarding_enrichment_jobs`.
   - Se nao existe → 409 `NO_EXISTING_JOB`.
   - Reseta `phase_*_status` das fases a partir da indicada (e subsequentes) para `pending`.
   - Atualiza `status` para `processing`.
7. Se execucao completa (sem retry): cria ou atualiza (upsert) registro em `onboarding_enrichment_jobs` com `status: 'processing'` e todos os `phase_*_status: 'pending'`.
8. Retorna `{ success: true, job_id, status: 'processing' }` imediatamente.
9. Despacha o pipeline assincrono em background via `EdgeRuntime.waitUntil()`.

### Fase assincrona (background — 4 fases sequenciais)

Cada fase:
- Atualiza `phase_*_status` para `processing` no inicio
- Appenda entrada em `phases_log` com `started_at`
- Ao concluir, atualiza `phase_*_status` para `completed`, `skipped` ou `failed`
- Appenda `finished_at`, `duration_ms`, `source` e `attempts[]` no `phases_log`

Se `retry_from_phase` foi informado, as fases anteriores sao puladas (seus `phase_*_status` permanecem inalterados do job anterior).

#### Fase 1: Extracao de Cores (`colors`)

**Objetivo**: Preencher `onboarding_identity.brand_palette` automaticamente.

**Sequencia de tentativas (waterfall com fallback):**

1. **Logo (algoritmo)**: Se `logo_path` existe, baixar imagem do bucket `onboarding-identity`, extrair paleta dominante via algoritmo de quantizacao de cor (k-means ou median cut, ate `color_extraction_max` cores da config). Source: `logo_algorithm`.
2. **Logo (Gemini Vision)**: Se algoritmo falhou ou retornou resultado insuficiente, enviar logo para Gemini Vision com prompt de `enrichment_config.color_gemini_prompt`. Source: `logo_gemini`.
3. **Site CSS**: Se nao tem logo ou tentativas anteriores falharam, e `site_url` existe, fazer fetch do HTML do site (timeout: `scrape_timeout_ms`, user-agent: `scrape_user_agent`), extrair cores de CSS (variaveis CSS custom, `background-color`, `color` dos elementos principais). Source: `site_css`.
4. **Fallback**: Se tudo falhou, usar `enrichment_config.color_fallback_palette`. Source: `fallback`.

**Retry automatico**: Chamadas ao Gemini tem retry com backoff configuravel (`retry_gemini_max`, `retry_gemini_backoff_ms`). Scraping tem retry configuravel (`retry_scrape_max`, `retry_scrape_backoff_ms`). Retries sao disparados em HTTP 429, 500, 503 e timeout.

**Resultado**: Grava `extracted_palette`, `extracted_palette_source` no job. Atualiza `onboarding_identity.brand_palette` com a paleta extraida.

#### Fase 2: Deteccao de Fonte (`font`)

**Objetivo**: Preencher `onboarding_identity.font_choice` automaticamente.

**Sequencia:**

1. **Site CSS scraping**: Se `site_url` existe, fazer fetch do HTML/CSS do site e extrair declaracoes `font-family` dos elementos `body`, `h1`-`h6`, e elementos com maior especificidade. Priorizar a fonte mais usada (excluindo genericas como `sans-serif`, `serif`, `monospace`). Source: `site_css`.
2. **Validacao via Gemini**: Enviar para Gemini usando `enrichment_config.font_validation_prompt` (com template variables resolvidas). Se `approved: false`, usar `suggestion` como alternativa.
3. **Fallback sem site**: Se nao tem `site_url` ou scraping falhou, usar `enrichment_config.font_suggestion_prompt` via Gemini. Source: `gemini_suggestion`.
4. **Fallback final**: Se tudo falhou, usar `enrichment_config.font_fallback`. Source: `fallback`.

**Retry automatico**: Mesma politica da Fase 1 para chamadas Gemini e scraping.

**Resultado**: Grava `detected_font`, `detected_font_source`, `font_validated`, `font_validation_reason` no job. Atualiza `onboarding_identity.font_choice`.

#### Fase 3: Geracao de Briefing via Perplexity (`briefing`)

**Objetivo**: Gerar briefing estruturado de campanha sem input manual do cliente.

**Dados de entrada (montados automaticamente a partir do banco):**

| Dado | Fonte |
|------|-------|
| `company_name` | `clientes.nome` ou `clientes.nome_fantasia` (via `compras.cliente_id`) |
| `company_site` | `onboarding_identity.site_url` |
| `celebrity_name` | `celebridadesReferencia.nome` (via `compras.celebridade`) |
| `context.segment` | `segmentos.nome` (via `compras.segmento`) |
| `context.region` | `compras.regiaocomprada` |
| `instagram_handle` | `onboarding_identity.instagram_handle` |

**Fluxo:**

1. Montar payload completo para `generate-campaign-briefing` a partir dos dados do banco.
2. Se `site_url` ausente mas `instagram_handle` presente, construir URL do Instagram como `company_site` alternativo: `https://www.instagram.com/{handle}`.
3. Chamar internamente `generate-campaign-briefing` via HTTP POST (service role), passando todos os campos. Timeout: `enrichment_config.timeout_briefing_ms` (a funcao chamada tem seu proprio timeout da `perplexity_config`; o timeout aqui e o abort externo).
4. Verificar resposta: se `success: true`, marcar `briefing_generated: true` e `phase_briefing_status: 'completed'`.
5. Se falhar, registrar erro mas **nao bloquear** — o pipeline continua para Fase 4 (campanha sem briefing e possivel, embora menos rica). Marcar `phase_briefing_status: 'failed'`.

**Retry automatico**: Herda retry da propria `generate-campaign-briefing` (Perplexity client ja tem retry interno). Nao adicionar retry extra nesta camada para evitar duplicacao.

**Resultado**: Briefing salvo em `onboarding_briefings` pela funcao `generate-campaign-briefing` (ja faz isso nativamente). Job atualizado com `briefing_generated`.

#### Fase 4: Disparo do Job de Campanha IA (`campaign`)

**Objetivo**: Criar o job de geracao de 12 criativos publicitarios.

**Pre-condicoes verificadas:**

- `onboarding_identity.brand_palette` preenchida (pela Fase 1)
- `onboarding_identity.font_choice` preenchido (pela Fase 2)
- `onboarding_identity.logo_path` presente (do upload do cliente — se ausente, nao bloqueia mas pode impactar qualidade)
- Celebridade com `fotoPrincipal` existente

**Fluxo:**

1. Chamar internamente `create-ai-campaign-job` via HTTP POST (service role) com `{ compra_id }`.
2. Se `success: true`, gravar `campaign_job_id` no enrichment job. Marcar `phase_campaign_status: 'completed'`.
3. Se falhar, marcar `phase_campaign_status: 'failed'` e logar erro detalhado.

**Resultado**: `campaign_job_id` gravado no enrichment job.

### Calculo do status final

Apos a ultima fase executada, o status global do job e calculado:

| Condicao | Status global |
|----------|---------------|
| Todas as 4 `phase_*_status` sao `completed` ou `skipped` | `completed` |
| Pelo menos 1 fase `completed` e pelo menos 1 `failed` | `partial` |
| Todas as fases executadas sao `failed` | `failed` |

---

## Schema do `phases_log` (JSONB)

Cada entrada no array segue este formato tipado:

```json
[
  {
    "phase": "colors",
    "status": "completed",
    "source": "logo_algorithm",
    "started_at": "2026-04-08T15:30:00.000Z",
    "finished_at": "2026-04-08T15:30:02.340Z",
    "duration_ms": 2340,
    "attempts": [
      {
        "method": "logo_algorithm",
        "success": true,
        "duration_ms": 2340,
        "result_summary": "5 cores extraidas"
      }
    ]
  },
  {
    "phase": "font",
    "status": "completed",
    "source": "site_css",
    "started_at": "2026-04-08T15:30:02.340Z",
    "finished_at": "2026-04-08T15:30:06.460Z",
    "duration_ms": 4120,
    "attempts": [
      {
        "method": "site_css",
        "success": true,
        "duration_ms": 1200,
        "result_summary": "Montserrat detectada"
      },
      {
        "method": "gemini_validation",
        "success": true,
        "duration_ms": 2920,
        "result_summary": "approved=true"
      }
    ]
  },
  {
    "phase": "briefing",
    "status": "completed",
    "source": "perplexity",
    "started_at": "2026-04-08T15:30:06.460Z",
    "finished_at": "2026-04-08T15:30:24.100Z",
    "duration_ms": 17640,
    "attempts": [
      {
        "method": "generate-campaign-briefing",
        "success": true,
        "duration_ms": 17640,
        "result_summary": "briefing_json persistido"
      }
    ]
  },
  {
    "phase": "campaign",
    "status": "completed",
    "source": "create-ai-campaign-job",
    "started_at": "2026-04-08T15:30:24.100Z",
    "finished_at": "2026-04-08T15:30:25.800Z",
    "duration_ms": 1700,
    "attempts": [
      {
        "method": "create-ai-campaign-job",
        "success": true,
        "duration_ms": 1700,
        "result_summary": "job_id=abc-123, 12 assets criados"
      }
    ]
  }
]
```

Campos de cada `attempt`:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `method` | string | Identificador do metodo tentado (ex: `logo_algorithm`, `logo_gemini`, `site_css`, `gemini_validation`, `gemini_suggestion`, `generate-campaign-briefing`, `create-ai-campaign-job`) |
| `success` | boolean | Se a tentativa foi bem-sucedida |
| `duration_ms` | integer | Duracao da tentativa em milissegundos |
| `result_summary` | string | Resumo curto do resultado (max 200 chars) |
| `error` | string (opcional) | Mensagem de erro se `success: false` |
| `retry_count` | integer (opcional) | Numero de retries automaticos executados nesta tentativa |

---

## Retry (3 niveis)

### Nivel 1: Retry automatico intra-fase (transparente)

Cada chamada externa tem retry automatico com backoff exponencial, configuravel via `enrichment_config`:

| Operacao | Config max retries | Config backoff | Dispara em |
|----------|-------------------|----------------|------------|
| Gemini Vision (cores/fonte) | `retry_gemini_max` (default: 2) | `retry_gemini_backoff_ms` (default: `1000,3000`) | HTTP 429, 500, 503, timeout |
| Fetch site (scraping) | `retry_scrape_max` (default: 1) | `retry_scrape_backoff_ms` (default: `2000`) | Timeout, network error |
| Perplexity (briefing) | Herda de `perplexity_config` | Herda de `perplexity_config` | Gerenciado pelo client existente |

Retries sao **internos a fase** — o `phases_log` registra o `retry_count` em cada `attempt`, mas o `phase_*_status` so muda apos todas as tentativas.

### Nivel 2: Retry manual por fase (via endpoint)

Campo `retry_from_phase` no body da requisicao permite retomar de qualquer fase:

| `retry_from_phase` | Fases executadas | Fases preservadas |
|--------------------|------------------|-------------------|
| ausente / `null` | 1→2→3→4 (pipeline completo) | Nenhuma (upsert limpo) |
| `colors` | 1→2→3→4 | Nenhuma (recomeça tudo) |
| `font` | 2→3→4 | Fase 1 (cores) |
| `briefing` | 3→4 | Fases 1 e 2 (cores + fonte) |
| `campaign` | 4 | Fases 1, 2 e 3 (cores + fonte + briefing) |

Ao receber `retry_from_phase`:
1. Busca job existente (obrigatorio — se nao existe, retorna 409).
2. Reseta `phase_*_status` das fases indicada e subsequentes para `pending`.
3. Mantem resultados das fases anteriores (`extracted_palette`, `detected_font`, etc.).
4. Limpa `error_phase` e `error_message`.
5. Appenda nova entrada no `phases_log` com marcador `retry_from`.
6. Executa apenas as fases a partir da indicada.

### Nivel 3: Retry agendado (V2 — fora do escopo inicial)

Cron job futuro que busca `WHERE status IN ('failed', 'partial') AND updated_at < now() - interval '1 hour'` e redispara automaticamente. O schema ja suporta — basta fazer SELECT + chamar o endpoint com `retry_from_phase` da primeira fase falhada.

---

## Integracao com briefing no pipeline de imagens

O briefing gerado pela Perplexity (`onboarding_briefings.briefing_json`) deve ser consumido pelo `create-ai-campaign-job` para enriquecer os prompts de geracao de imagem. Alteracao necessaria no `create-ai-campaign-job`:

1. Apos carregar `onboarding_identity`, carregar tambem `onboarding_briefings` da mesma `compra_id`.
2. Se `briefing_json` existir e `status = 'done'`, extrair campos relevantes:
   - `briefing.objetivo_campanha` → incorporar no prompt como contexto de campanha
   - `briefing.publico_alvo` → direcionar linguagem visual
   - `briefing.tom_voz` → ajustar tom dos textos gerados
   - `briefing.mensagem_central` → usar como headline base
   - `briefing.cta_principal` → usar como CTA nos criativos
   - `insights_pecas` → fornecer direcao criativa por variacao
3. Passar esses campos como parte do `PromptInput` para o `buildPrompt()`.
4. Se briefing nao existir, o pipeline continua funcionando como hoje (sem enriquecimento textual).

**Nota**: Esta integracao e uma alteracao no `create-ai-campaign-job` e `prompt-builder.ts`, nao nesta funcao.

---

## Resposta (200)

Pipeline completo:

```json
{
  "success": true,
  "job_id": "uuid-do-enrichment-job",
  "status": "processing",
  "message": "Pipeline de enriquecimento iniciado."
}
```

Retry a partir de fase:

```json
{
  "success": true,
  "job_id": "uuid-do-enrichment-job",
  "status": "processing",
  "retry_from_phase": "briefing",
  "phases_preserved": ["colors", "font"],
  "message": "Retry iniciado a partir da fase briefing."
}
```

---

## Endpoint de consulta de status

Para polling do status do enrichment job, criar endpoint dedicado `get-enrichment-status`:

**GET** `?compra_id={uuid}`

```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "phase_colors_status": "completed",
    "phase_font_status": "completed",
    "phase_briefing_status": "processing",
    "phase_campaign_status": "pending",
    "extracted_palette": ["#384ffe", "#1a1a2e", "#ffffff"],
    "extracted_palette_source": "logo_algorithm",
    "detected_font": "Montserrat",
    "detected_font_source": "site_css",
    "font_validated": true,
    "briefing_generated": false,
    "campaign_job_id": null,
    "phases_log": [
      {
        "phase": "colors",
        "status": "completed",
        "source": "logo_algorithm",
        "started_at": "2026-04-08T15:30:00Z",
        "finished_at": "2026-04-08T15:30:02Z",
        "duration_ms": 2340,
        "attempts": [
          { "method": "logo_algorithm", "success": true, "duration_ms": 2340, "result_summary": "5 cores extraidas" }
        ]
      },
      {
        "phase": "font",
        "status": "completed",
        "source": "site_css",
        "started_at": "2026-04-08T15:30:02Z",
        "finished_at": "2026-04-08T15:30:06Z",
        "duration_ms": 4120,
        "attempts": [
          { "method": "site_css", "success": true, "duration_ms": 1200, "result_summary": "Montserrat detectada" },
          { "method": "gemini_validation", "success": true, "duration_ms": 2920, "result_summary": "approved=true" }
        ]
      },
      {
        "phase": "briefing",
        "status": "processing",
        "started_at": "2026-04-08T15:30:06Z",
        "attempts": []
      }
    ],
    "updated_at": "2026-04-08T15:30:06Z"
  }
}
```

---

## Tratamento de Erros

### Erros sincronos (resposta HTTP)

| HTTP | Codigo | Descricao |
|------|--------|-----------|
| 400 | `INVALID_COMPRA_ID` | compra_id ausente ou nao e UUID valido |
| 400 | `INVALID_RETRY_PHASE` | retry_from_phase com valor invalido (deve ser colors, font, briefing ou campaign) |
| 401 | `UNAUTHORIZED` | Chamada sem bearer service role |
| 404 | `COMPRA_NOT_FOUND` | Compra nao encontrada no banco |
| 405 | `METHOD_NOT_ALLOWED` | Metodo HTTP nao e POST |
| 409 | `NOT_ELIGIBLE` | Compra nao paga ou contrato nao assinado |
| 409 | `NO_EXISTING_JOB` | retry_from_phase informado mas nao existe job anterior |
| 422 | `IDENTITY_NOT_FOUND` | Nao existe registro em onboarding_identity para esta compra |
| 422 | `INSUFFICIENT_DATA` | Nem site_url nem instagram_handle preenchidos |
| 500 | `INTERNAL_ERROR` | Erro nao esperado na fase sincrona |

### Erros assincronos (background)

Erros nas fases assincronas NAO retornam HTTP. Sao registrados em:

- `phase_*_status` → `failed` na fase correspondente
- `error_phase` → nome da fase que falhou
- `error_message` → mensagem de erro (primeiros 500 chars)
- `phases_log` → entrada com `status: 'failed'` e detalhes no `attempts[].error`

---

## Dependencias Externas

### Supabase DB

- `compras` — elegibilidade (checkout_status, clicksign_status) e dados de contexto (cliente_id, celebridade, segmento, regiaocomprada)
- `clientes` — nome da empresa (nome, nome_fantasia)
- `celebridadesReferencia` — nome da celebridade
- `segmentos` — nome do segmento
- `onboarding_identity` — logo_path, site_url, instagram_handle, brand_palette, font_choice (leitura e atualizacao)
- `onboarding_enrichment_jobs` — job de enriquecimento (criacao, atualizacao de status)
- `onboarding_briefings` — persistencia do briefing (via `generate-campaign-briefing`)
- `ai_campaign_jobs` — referencia ao job de campanha criado
- `enrichment_config` — configuracao do pipeline (prompts, timeouts, retries, fallbacks)

### Supabase Storage

- Bucket `onboarding-identity` — download do logo para extracao de cores

### APIs Externas

- **Gemini** — analise de logo (cores), validacao/sugestao de fonte. Modelo e parametros vem de `enrichment_config`.
- **Perplexity Sonar** — geracao de briefing (via `generate-campaign-briefing`). Modelo e parametros vem de `perplexity_config`.
- **Site do cliente** — fetch de HTML/CSS para extracao de cores e fontes (scraping leve, read-only). Timeout e user-agent vem de `enrichment_config`.

---

## Modulos Compartilhados

- `_shared/cors.ts` — `handleCors()`, `corsHeaders`
- `_shared/service-role-auth.ts` — `requireServiceRole()`
- `_shared/ai-campaign/eligibility.ts` — `checkAiCampaignEligibility()`
- `_shared/perplexity/client.ts` — reutilizado indiretamente via `generate-campaign-briefing`

### Novos modulos a criar

- `_shared/enrichment/color-extractor.ts` — extracao de paleta de imagem (algoritmo k-means/median-cut)
- `_shared/enrichment/css-scraper.ts` — fetch e parse de CSS de sites (cores, fontes)
- `_shared/enrichment/font-detector.ts` — deteccao e validacao de fonte via CSS + Gemini
- `_shared/enrichment/config.ts` — loader da `enrichment_config` com cache TTL (mesmo padrao de `_shared/nanobanana/config.ts`)

---

## Observabilidade

- Prefixo de log: `[onboarding-enrichment]`
- Cada fase loga inicio e fim com duracao: `[enrichment.phase.colors.start]`, `[enrichment.phase.colors.done]`, etc.
- Cada tentativa dentro de uma fase loga: `[enrichment.attempt.logo_algorithm.start]`, `[enrichment.attempt.logo_algorithm.success]` ou `[enrichment.attempt.logo_algorithm.failed]`
- Retries logam: `[enrichment.retry]` com `{ method, attempt, backoff_ms, reason }`
- Erros logam fase + mensagem + stack (primeiros 500 chars)
- Campo `phases_log` no job armazena historico completo para diagnostico via `AiStep2Monitor`

---

## Alteracoes em funcoes existentes

### `save-onboarding-identity`

1. Aceitar e persistir novos campos: `site_url`, `instagram_handle` (alem de `campaign_notes` que continua existindo por compatibilidade).
2. Remover envio de `production_path` pelo frontend (setar `production_path = 'standard'` automaticamente no backend quando `site_url` ou `instagram_handle` estiverem presentes).
3. Apos upsert bem-sucedido, se `site_url` OU `instagram_handle` preenchidos, disparar `onboarding-enrichment` via HTTP POST (service role, fire-and-forget), substituindo o trigger direto a `create-ai-campaign-job`.

### `create-ai-campaign-job`

1. Relaxar gate de identidade: aceitar job **sem** `logo_path` (logo e desejavel mas nao obrigatorio).
2. Carregar `onboarding_briefings` da compra e incluir campos do briefing no `PromptInput`.
3. Manter gate de `brand_palette` e `font_choice` (agora preenchidos automaticamente pelo enrichment).

### `Etapa62.jsx` (frontend)

1. Enviar `site_url` e `instagram_handle` como campos separados no FormData (alem de `campaign_notes` por compatibilidade).
2. Remover montagem manual de `campaign_notes` concatenando site + instagram (o backend faz isso agora).

### `EtapaFinal.jsx` (frontend)

1. Remover referencia a `productionPath` e `campaignBriefMode` no resumo (nao sao mais conceitos do fluxo do cliente).
2. Adicionar indicador de "Enriquecimento em andamento" se o enrichment job existir e estiver processando.

### `OnboardingContext.jsx` (frontend)

1. Adicionar campos `siteUrl` e `instagramHandle` na hidratacao a partir das novas colunas (nao mais parseando `campaign_notes`).

---

## Deploy

```bash
supabase functions deploy onboarding-enrichment --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

---

## Notas

- **Idempotencia**: UNIQUE index em `compra_id` na tabela `onboarding_enrichment_jobs`. Execucao completa (sem `retry_from_phase`) faz upsert limpo. Retry preserva resultados anteriores.
- **Rate limiting de scraping**: O fetch do site do cliente usa timeout e user-agent configuraveis via `enrichment_config`. Nao fazer crawl profundo — apenas a pagina principal.
- **Etapa7.jsx**: Arquivo orfao que deve ser removido do repositorio apos implementacao deste pipeline. Toda a logica de `production_path: hybrid` e entrada manual de briefing torna-se obsoleta.
- **campaign_notes**: Campo mantido por compatibilidade retroativa. O backend continua aceitando e armazenando, mas o pipeline de enriquecimento usa `site_url` e `instagram_handle` diretamente.
- **Retry via AiStep2Monitor**: O monitor deve permitir re-disparar o enrichment job para uma compra. Exibir botoes de retry por fase (ex: "Retentar briefing") que chamam o endpoint com `retry_from_phase`.
- **Fallback encadeado**: Todas as fases usam waterfall de tentativas com fallback. O pipeline nunca trava completamente — na pior hipotese, usa paleta Acelerai Blue + Inter + briefing vazio e gera os criativos com o que tem.
- **Configuracao editavel**: Todos os prompts, timeouts, retries e fallbacks sao configuraveis via `enrichment_config` sem redeploy. Novos endpoints `get-enrichment-config` e `update-enrichment-config` seguem o padrao de `get-perplexity-config` / `update-perplexity-config`.
- **Evolucao V2**: Retry agendado (cron), notificacao ao atendente quando enrichment completa, pre-fetch de informacoes do Instagram via API.
