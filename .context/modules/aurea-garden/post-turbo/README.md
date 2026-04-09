# Post Turbo — Submodulo de Context Engineering

> Turbinar imagens existentes com direcao criativa, branding e IA (**image-to-image**) via Gemini (NanoBanana).

## Visao Geral

Post Turbo recebe uma imagem base + direction criativa e gera uma versao turbinada com branding. Diferente do Post Gen (prompt-to-image), o Post Turbo parte de uma imagem existente e a transforma segundo uma direcao criativa selecionada.

**URL:** `http://localhost:5173/ai-step2/post-turbo`

## Arquitetura

```
PostTurboPage.jsx (frontend)
  │
  ├─ useGardenOptions() → GET /get-garden-options
  │   └─ Popula: celebridades, segmentos, subsegmentos, negocios
  │
  ├─ GET /get-nanobanana-config
  │   └─ Carrega directions para auto-fill do prompt
  │
  ├─ extractColorsFromImage() (client-side, logo)
  │
  └─ POST /post-turbo-generate (multipart/form-data OBRIGATORIO)
      │
      ├─ Validacao + upload source/logo/product → aurea-garden-assets/turbo/{jobId}/
      ├─ INSERT garden_jobs (status: processing)
      ├─ Return 202 { job_id, status, request_id }
      │
      └─ Background (EdgeRuntime.waitUntil):
          ├─ loadNanoBananaConfig()
          ├─ Resolve celebrity → celebridades.fotoPrincipal
          ├─ Gera signed URLs (10min) para todos os assets
          ├─ buildPostTurboPrompt()
          ├─ generateImage(prompt, celebritySlot, logoSlot, campaignSlot, referenceSlot)
          ├─ Upload output.png → storage
          └─ UPDATE garden_jobs (completed | failed)
  │
  └─ Polling (3s) → GET /get-garden-job?job_id={id}
```

## Componentes Principais

| Componente | Path | Responsabilidade |
|------------|------|-----------------|
| PostTurboPage.jsx | `src/pages/AiStep2Monitor/PostTurboPage.jsx` | Form + image upload + polling + resultado |
| post-turbo-generate | `supabase/functions/post-turbo-generate/index.ts` | Edge Function principal |
| prompt-builder.ts | `supabase/functions/_shared/ai-campaign/prompt-builder.ts` | Montagem do prompt (shared) |
| image-generator.ts | `supabase/functions/_shared/ai-campaign/image-generator.ts` | Chamada Gemini + 5 slots de imagem |
| config.ts | `supabase/functions/_shared/nanobanana/config.ts` | Loader do NanoBanana config |
| validate.ts | `supabase/functions/_shared/garden/validate.ts` | Validacao de inputs |
| color-extractor.js | `src/lib/color-extractor.js` | Extracao de cores do logo |
| creative-directions.md | `docs/creative-directions.md` | Prompts default das 3 directions |

## Prompt Pipeline

O prompt e construido em 6 secoes separadas por `---`:

1. **CREATIVE DIRECTION** — direction selecionada (moderna/clean/retail) do config
2. **BRAND PALETTE** — cores hex extraidas do logo + manuais (max 5)
3. **CELEBRITY** — nome da celebridade (se selecionada)
4. **FORMAT** — instrucao do formato (`format_1_1`, `format_4_5`, etc.) do config
5. **USER INSTRUCTIONS** — prompt livre (pre-preenchido com direction text)
6. **MANDATORY** — instrucao final: enhance base image, branding, PT-BR

## 5 Slots de Imagem

Post Turbo usa TODOS os 5 slots do `generateImage()`:

| Slot | Parametro | Origem | Fallback |
|------|-----------|--------|----------|
| 1 | `celebrityPngUrl` | `celebridades.fotoPrincipal` | Source image URL |
| 2 | `clientLogoUrl` | Logo uploaded (signed URL) | Source image URL |
| 3 | `campaignImageUrl` | Product image (signed URL) | `undefined` |
| 4 | `categoryReferenceImageUrl` | SEMPRE source image URL | — |

## Regras de Negocio Criticas

1. **3 Directions selecionaveis:** moderna, clean, retail — usuario escolhe no frontend
2. **Auto-fill do prompt:** Ao selecionar direction, o campo prompt e preenchido com `config.direction_{dir}`
3. **Imagem base obrigatoria:** Source image e o input principal (image-to-image)
4. **Multipart obrigatorio:** EXIGE `multipart/form-data` — rejeita JSON
5. **Celebrity com imagem:** Resolve `fotoPrincipal` da tabela `celebridades` (fallback: source image)
6. **Config-driven:** Directions e formatos vem de `nanobanana_config`
7. **3 uploads possiveis:** source (obrigatorio) + logo (opcional) + product (opcional)

## Fluxo de Dados (DB)

```
garden_jobs
  id: UUID (jobId)
  tool: 'post-turbo'
  status: processing → completed | failed
  input_prompt: texto do prompt (pode ser auto-fill da direction)
  input_format: '1:1' | '4:5' | '16:9' | '9:16'
  input_model: 'nanobanana'
  input_metadata: { direction, celebrity_name, has_logo, has_product_image, palette }
  source_image_path: turbo/{jobId}/source.{ext}
  output_image_path: turbo/{jobId}/output.png
  output_image_url: signed URL (7 dias)
  duration_ms: tempo de geracao
  error_code: PROVIDER_ERROR | UPLOAD_ERROR | INTERNAL_ERROR
  request_id: UUID (tracing)
```

## Deploy

```bash
supabase functions deploy post-turbo-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
