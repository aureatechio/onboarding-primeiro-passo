# Fluxo de Geração de Imagem Pós-Onboarding

> Artefato explicativo do fluxo executável real — do trigger até os 12 assets finais no bucket.
> Baseado em leitura direta do código. Referências no formato `arquivo:linha`.

---

## 1. Visão em 30 segundos

```
Etapa 6.2 (frontend)
      │  POST
      ▼
save-onboarding-identity ──(EdgeRuntime.waitUntil)──► onboarding-enrichment
                                                              │
                                       ┌──────────────────────┼──────────────────────┐
                                       ▼                      ▼                      ▼
                                  [colors]               [font]                [briefing]
                                                                                     │
                                                                                     ▼
                                                                        create-ai-campaign-job
                                                                                     │
                                                       cria 12 assets (3 × 4) em ai_campaign_assets
                                                                                     │
                                                              dispatchWorkers (batches paralelos)
                                                                                     │
                                                                 generate-ai-campaign-image (×12)
                                                                                     │
                                                              Gemini → bucket ai-campaign-assets
                                                                                     │
                                                             Frontend AiStep2Monitor (polling 3s/15s)
```

Todo o pipeline é **assíncrono**: cada Edge Function responde HTTP 200 imediatamente e continua o trabalho em background via `EdgeRuntime.waitUntil()`.

---

## 2. Trigger — onde o fluxo começa

Arquivo: [save-onboarding-identity/index.ts](supabase/functions/save-onboarding-identity/index.ts)

- O trigger acontece na **Etapa 6.2** do onboarding, quando o cliente salva sua identidade visual.
- Condição mínima: o payload precisa ter `site_url` **ou** `instagram_handle` preenchido ([index.ts:280](supabase/functions/save-onboarding-identity/index.ts:280)).
- Após o upsert em `onboarding_identity`, a função chama `triggerEnrichmentPipeline(compra_id)` ([index.ts:25](supabase/functions/save-onboarding-identity/index.ts:25)), que faz um `POST` HTTP para `onboarding-enrichment` em background. O frontend **não espera** o pipeline terminar.

> **Observação**: sem `site_url` nem `instagram_handle`, nenhuma imagem é gerada — o pipeline nem sequer inicia.

---

## 3. `onboarding-enrichment` — orquestrador de 4 fases

Arquivo: [onboarding-enrichment/index.ts](supabase/functions/onboarding-enrichment/index.ts)

Responde imediato com `{ job_id, status: 'processing' }` ([index.ts:906](supabase/functions/onboarding-enrichment/index.ts:906)) e dispara `runPipeline()` em background ([index.ts:498](supabase/functions/onboarding-enrichment/index.ts:498)).

| Fase | O que faz | Waterfall | Persistência |
|---|---|---|---|
| **colors** ([index.ts:164](supabase/functions/onboarding-enrichment/index.ts:164)) | Extrai paleta da marca | logo (pixel) → logo (Gemini Vision) → CSS do site | `onboarding_identity.brand_palette` |
| **font** ([index.ts:294](supabase/functions/onboarding-enrichment/index.ts:294)) | Detecta tipografia | CSS do site → sugestão Gemini → fallback | `onboarding_identity.font_choice` |
| **briefing** ([index.ts:330](supabase/functions/onboarding-enrichment/index.ts:330)) | Gera briefing de campanha | Chama `generate-campaign-briefing` (Perplexity) | `onboarding_briefings.briefing_json` |
| **campaign** ([index.ts:421](supabase/functions/onboarding-enrichment/index.ts:421)) | Dispara geração de imagens | Chama `create-ai-campaign-job` | `onboarding_enrichment_jobs.campaign_job_id` |

Cada fase atualiza seu respectivo `phase_*_status` em `onboarding_enrichment_jobs` e um `phases_log` (JSONB) com histórico detalhado. Falha em uma fase **não aborta** as demais — o status final pode ser `completed`, `partial` ou `failed`.

---

## 4. `create-ai-campaign-job` — criação do job e dos 12 slots

Arquivo: [create-ai-campaign-job/index.ts](supabase/functions/create-ai-campaign-job/index.ts)

### 4.1 Etapa síncrona (antes de responder)
1. Valida elegibilidade ([index.ts:228](supabase/functions/create-ai-campaign-job/index.ts:228))
2. Carrega identidade visual ([:243](supabase/functions/create-ai-campaign-job/index.ts:243))
3. Carrega briefing ([:317](supabase/functions/create-ai-campaign-job/index.ts:317))
4. Carrega `nanobanana_config` ([:357](supabase/functions/create-ai-campaign-job/index.ts:357))
5. Resolve direções criativas (`moderna`, `clean`, `retail`) ([:397](supabase/functions/create-ai-campaign-job/index.ts:397))
6. Calcula `input_hash` para idempotência ([:412](supabase/functions/create-ai-campaign-job/index.ts:412)) — mesma entrada = mesmo job, sem duplicação.
7. Cria/retoma linha em `ai_campaign_jobs` ([:433](supabase/functions/create-ai-campaign-job/index.ts:433))
8. **Pré-cria 12 assets** com `status='pending'` ([:542](supabase/functions/create-ai-campaign-job/index.ts:542)) — matriz fixa de **3 grupos × 4 formatos**:

|            | 1:1 | 4:5 | 16:9 | 9:16 |
|------------|-----|-----|------|------|
| **moderna**| ✓   | ✓   | ✓    | ✓    |
| **clean**  | ✓   | ✓   | ✓    | ✓    |
| **retail** | ✓   | ✓   | ✓    | ✓    |

### 4.2 Etapa assíncrona — `dispatchWorkers()`
[index.ts:601](supabase/functions/create-ai-campaign-job/index.ts:601)

- Itera os 12 assets em lotes (`worker_batch_size`, default `4`, vindo de `nanobanana_config`).
- Para cada asset no lote, faz `fetch` paralelo para `generate-ai-campaign-image` e aguarda com `Promise.allSettled()`.
- No fim, reconcilia o status agregado do job: `completed` | `partial` | `failed`.

---

## 5. `generate-ai-campaign-image` — worker por asset

Arquivo: [generate-ai-campaign-image/index.ts](supabase/functions/generate-ai-campaign-image/index.ts)

Cada chamada processa **1 asset** de forma síncrona ([index.ts:39](supabase/functions/generate-ai-campaign-image/index.ts:39)):

1. Marca `ai_campaign_assets.status = 'processing'` ([:93](supabase/functions/generate-ai-campaign-image/index.ts:93))
2. Chama `generateImage()` em [_shared/ai-campaign/image-generator.ts:45](supabase/functions/_shared/ai-campaign/image-generator.ts:45):
   - Provider: **Gemini** (modelo e params vindos de `nanobanana_config`)
   - Inputs: prompt composto, logo do cliente, imagens da campanha, imagem de referência da direção, celebridade (PNG)
   - Config de segurança e `systemInstruction` também vêm do NanoBanana
3. Upload do PNG resultante no bucket `ai-campaign-assets` ([:127](supabase/functions/generate-ai-campaign-image/index.ts:127))
4. Atualiza asset: `status='completed'`, `image_url`, dimensões ([:144](supabase/functions/generate-ai-campaign-image/index.ts:144))
5. Incrementa `ai_campaign_jobs.total_generated` ([:153](supabase/functions/generate-ai-campaign-image/index.ts:153))
6. Em erro → `markAssetFailed()` + linha em `ai_campaign_errors` ([:179](supabase/functions/generate-ai-campaign-image/index.ts:179))

---

## 6. Tabelas envolvidas e transições de estado

### `onboarding_enrichment_jobs` (master do pipeline)
`pending → processing → completed | partial | failed`

Campos-chave: `phase_colors_status`, `phase_font_status`, `phase_briefing_status`, `phase_campaign_status`, `campaign_job_id` (FK → `ai_campaign_jobs.id`), `phases_log` (JSONB).

### `ai_campaign_jobs` (master da geração de imagens)
`processing → completed | partial | failed`

Campos-chave: `compra_id`, `input_hash` (idempotência), `total_expected = 12`, `total_generated` (0..12).

### `ai_campaign_assets` (12 linhas por job)
Por asset: `pending → processing → completed | failed`

Campos-chave: `group_name` (`moderna|clean|retail`), `format` (`1:1|4:5|16:9|9:16`), `image_url` (path no bucket), `width`, `height`.

### `ai_campaign_errors`
Log granular. `error_type ∈ { upload_error, model_error, worker_call_exception, worker_http_error, worker_response_invalid, stale_processing_timeout }`.

### Dependências de leitura
- `onboarding_identity` — logo, paleta, fonte, imagens da campanha
- `onboarding_briefings` — `briefing_json` (Perplexity)
- `nanobanana_config` — direções, modelos, prompts por formato, safety

---

## 7. Storage buckets

| Bucket | Papel |
|---|---|
| `onboarding-identity` | Logo e imagens enviadas pelo cliente no onboarding |
| `nanobanana-references` | Imagens de referência por direção criativa |
| `ai-campaign-assets` | **Saída final**: os 12 PNGs gerados |

---

## 8. Dependências externas

| Provider | Usado em | Para quê |
|---|---|---|
| **Perplexity** | fase `briefing` (`generate-campaign-briefing`) | Gerar `briefing_json` (objetivo, público, tom, CTA, insights por peça) |
| **Gemini (Vision / text)** | fase `colors` e `font` | Extrair paleta do logo e sugerir tipografia |
| **Gemini (image gen)** | `generate-ai-campaign-image` | Gerar o PNG final por asset |

Todas as credenciais e parâmetros (modelo, `temperature`, `top_p`, `top_k`, retries) vêm das tabelas singleton `enrichment_config` e `nanobanana_config` — **nunca** hardcoded.

---

## 9. Frontend — `AiStep2Monitor` (polling adaptativo)

Arquivo: [useAiCampaignMonitor.js](src/pages/AiStep2Monitor/useAiCampaignMonitor.js)

- Endpoint principal: `get-ai-campaign-monitor` (retorna job + 12 assets com signed URLs + diagnósticos).
- Polling adaptativo ([useAiCampaignMonitor.js:222](src/pages/AiStep2Monitor/useAiCampaignMonitor.js:222)):
  - **3 s** enquanto o job está `pending`/`processing`
  - **15 s** quando o job já terminou (ou em modo lista)
- Ações de retry via `retry-ai-campaign-assets` (modos: `single`, `failed`, `category`, `all`) — internamente reabre o dispatch com `forceJobId`.

---

## 10. Timeline consolidada

```
T0   POST /save-onboarding-identity               (usuário conclui etapa 6.2)
T0+  └─ HTTP 200 imediato
T0+  └─ [bg] POST /onboarding-enrichment
T1      └─ HTTP 200 imediato (job_id)
T1+     └─ [bg] runPipeline()
             ├─ fase colors   →  onboarding_identity.brand_palette
             ├─ fase font     →  onboarding_identity.font_choice
             ├─ fase briefing →  onboarding_briefings (Perplexity)
             └─ fase campaign →  POST /create-ai-campaign-job
T2                                  └─ HTTP 200 imediato (campaign_job_id)
T2+                                 └─ [bg] dispatchWorkers()
                                        └─ batches de 4 × POST /generate-ai-campaign-image
                                              ├─ Gemini image gen
                                              ├─ upload bucket ai-campaign-assets
                                              └─ update ai_campaign_assets + total_generated
T2+→ Tn  Frontend AiStep2Monitor faz polling a 3 s até status final
```

---

## 11. Observações operacionais

1. **Idempotência por hash** — reenviar o mesmo onboarding não gera novo job; `input_hash` em `ai_campaign_jobs` ([create-ai-campaign-job/index.ts:436](supabase/functions/create-ai-campaign-job/index.ts:436)).
2. **Reconciliação de stale assets** — `get-ai-campaign-monitor` marca como `failed` qualquer asset preso em `processing` há mais de 10 min ([get-ai-campaign-monitor/index.ts:667](supabase/functions/get-ai-campaign-monitor/index.ts:667)).
3. **Falhas isoladas** — um asset falhando não derruba o job; o status final vira `partial` se `0 < total_generated < 12`.
4. **Matriz fixa** — 3 grupos × 4 formatos é hardcoded. Mudar requer migration + ajuste em `create-ai-campaign-job` e no consumo do frontend.
5. **Retries** — ficam por conta do usuário via `retry-ai-campaign-assets`. Não há retry automático no nível do worker (há retry interno do Gemini SDK por `max_retries`).

---

## 12. Referências rápidas

| Componente | Arquivo | Linha |
|---|---|---|
| Trigger | `save-onboarding-identity/index.ts` | 25, 280 |
| Orquestrador | `onboarding-enrichment/index.ts` | 498 |
| Fase colors / font / briefing / campaign | idem | 164 / 294 / 330 / 421 |
| Criação do job e 12 assets | `create-ai-campaign-job/index.ts` | 196, 542 |
| Dispatch paralelo | idem | 601 |
| Worker por asset | `generate-ai-campaign-image/index.ts` | 39 |
| Chamada Gemini | `_shared/ai-campaign/image-generator.ts` | 45 |
| Config NanoBanana | `_shared/nanobanana/config.ts` | — |
| Polling frontend | `src/pages/AiStep2Monitor/useAiCampaignMonitor.js` | 222 |
| Monitor endpoint | `get-ai-campaign-monitor/index.ts` | 254, 667 |
| Retry endpoint | `retry-ai-campaign-assets/index.ts` | 28 |
