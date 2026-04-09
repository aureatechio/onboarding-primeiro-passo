# Post Gen — Submodulo de Context Engineering

> Geracao de criativos publicitarios **prompt-to-image** via Gemini (NanoBanana).

## Visao Geral

Post Gen recebe um brief estruturado (celebridade, segmento, estilo, paleta, prompt livre) e gera uma imagem publicitaria do zero. Nao requer imagem base — a geracao e 100% prompt-driven.

**URL:** `http://localhost:5173/ai-step2/post-gen`

## Arquitetura

```
PostGenPage.jsx (frontend)
  │
  ├─ useGardenOptions() → GET /get-garden-options
  │   └─ Popula: celebridades, segmentos, subsegmentos, negocios
  │
  ├─ extractColorsFromImage() (client-side, median-cut)
  │
  └─ POST /post-gen-generate (multipart/form-data ou JSON)
      │
      ├─ Validacao + upload logo → aurea-garden-assets/gen/{jobId}/
      ├─ INSERT garden_jobs (status: processing)
      ├─ Return 202 { job_id, status, request_id }
      │
      └─ Background (EdgeRuntime.waitUntil):
          ├─ loadNanoBananaConfig()
          ├─ buildPostGenPrompt()
          ├─ generateImage() → Gemini API
          ├─ Upload output.png → storage
          └─ UPDATE garden_jobs (completed | failed)
  │
  └─ Polling (3s) → GET /get-garden-job?job_id={id}
```

## Componentes Principais

| Componente | Path | Responsabilidade |
|------------|------|-----------------|
| PostGenPage.jsx | `src/pages/AiStep2Monitor/PostGenPage.jsx` | Form + polling + resultado |
| post-gen-generate | `supabase/functions/post-gen-generate/index.ts` | Edge Function principal |
| prompt-builder.ts | `supabase/functions/_shared/ai-campaign/prompt-builder.ts` | Montagem do prompt |
| image-generator.ts | `supabase/functions/_shared/ai-campaign/image-generator.ts` | Chamada Gemini + retries |
| config.ts | `supabase/functions/_shared/nanobanana/config.ts` | Loader do NanoBanana config |
| validate.ts | `supabase/functions/_shared/garden/validate.ts` | Validacao de inputs |
| color-extractor.js | `src/lib/color-extractor.js` | Extracao de cores do logo |
| creative-directions.md | `docs/creative-directions.md` | Prompts default das 3 directions |

## Prompt Pipeline

O prompt e construido em 6 secoes separadas por `---`:

1. **CREATIVE BRIEF** — celebridade, negocio, segmento/subsegmento, estilo, localizacao, contexto
2. **BRAND PALETTE** — cores hex extraidas do logo + manuais (max 5)
3. **CREATIVE DIRECTION** — sempre `direction_moderna` do config (regra fixa)
4. **FORMAT** — instrucao do formato (`format_1_1`, `format_4_5`, etc.) do config
5. **USER PROMPT** — texto livre do usuario (max 5000 chars)
6. **MANDATORY** — instrucao final: criativo profissional, PT-BR, imagem unica

## Regras de Negocio Criticas

1. **Direction fixa:** Sempre usa `direction_moderna` — nao ha seletor no frontend
2. **Config-driven:** Directions e formatos vem de `nanobanana_config`, nunca hardcoded
3. **Logo opcional:** Sem logo, slots usam placeholder `placehold.co/1x1.png`
4. **Sacred Face Rule:** Celebridade vai como texto no brief, nao como imagem
5. **Aceita JSON:** Unico endpoint Garden que aceita `application/json` (sem logo)
6. **Paleta JSON:** `palette` e string JSON no form-data, max 5 cores

## Fluxo de Dados (DB)

```
garden_jobs
  id: UUID (jobId)
  tool: 'post-gen'
  status: processing → completed | failed
  input_prompt: texto do usuario
  input_format: '1:1' | '4:5' | '16:9' | '9:16'
  input_model: 'nanobanana'
  input_metadata: { celebrity_name, segment, subsegment, business, style, palette, city, state, briefing }
  source_image_path: gen/{jobId}/logo.{ext} | null
  output_image_path: gen/{jobId}/output.png
  output_image_url: signed URL (7 dias)
  duration_ms: tempo de geracao
  error_code: PROVIDER_ERROR | UPLOAD_ERROR | INTERNAL_ERROR
  request_id: UUID (tracing)
```

## Deploy

```bash
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
