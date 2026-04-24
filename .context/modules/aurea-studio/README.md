# Module: Aurea Garden (Post Gen)

## Overview

O modulo Aurea Garden e o sistema de geracao de criativos publicitarios da AUREA, integrado ao dashboard AI-Step2 Monitor. Oferece a ferramenta:

- **Post Gen** (prompt-to-image): gera criativos do zero a partir de brief estruturado (celebridade, segmento, estilo, paleta, prompt)

Usa o modelo **NanoBanana** (Gemini) via `generateImage()` compartilhado, processa em background com `EdgeRuntime.waitUntil()`, e persiste jobs na tabela `garden_jobs`.

> **Nota historica:** Post Turbo (image-to-image) foi descontinuado em 2026-04-24. Jobs antigos com `tool='post-turbo'` permanecem na tabela `garden_jobs` apenas como historico.

Documentos operacionais do modulo:
- Regras de negocio criticas: `.context/modules/aurea-garden/BUSINESS-RULES.md`
- Ordem de leitura por tipo de tarefa: `.context/modules/aurea-garden/DOC-READING-ORDER.md`
- Runbook operacional: `.context/modules/aurea-garden/OPERACAO-AUREA-GARDEN.md`
- Checklist consolidado: `.context/modules/aurea-garden/checklist-geral.md`

## Scope

### Directories

| Path | Description |
|------|-------------|
| `supabase/functions/post-gen-generate/` | Geracao prompt-to-image (multipart form → NanoBanana → bucket). |
| `supabase/functions/list-garden-jobs/` | Listagem paginada de jobs com filtros por tool e status. |
| `supabase/functions/get-garden-options/` | Dados de referencia: celebridades, segmentos, subsegmentos, negocios. |
| `supabase/functions/get-garden-job/` | Polling de status de um job individual. |
| `supabase/functions/_shared/garden/` | Validacoes compartilhadas (formato, imagem, prompt). |
| `supabase/functions/_shared/ai-campaign/image-generator.ts` | Provider de geracao de imagem (Gemini/NanoBanana). |
| `supabase/functions/get-nanobanana-config/` | Leitura da config NanoBanana (modelo, directions, formats). |
| `supabase/functions/update-nanobanana-config/` | Atualizacao da config NanoBanana. |
| `src/pages/AiStep2Monitor/PostGenPage.jsx` | UI do Post Gen (formulario + polling + resultado). |
| `src/pages/AiStep2Monitor/GardenGalleryPage.jsx` | Galeria unificada com filtros, paginacao e lightbox. |
| `src/pages/AiStep2Monitor/MonitorLayout.jsx` | Layout sidebar do painel AI-Step2 (navegacao Garden). |
| `src/pages/AiStep2Monitor/useGardenOptions.js` | Hook compartilhado para carregar opcoes (celebridades, segmentos). |
| `src/pages/AiStep2Monitor/constants.js` | Constantes: ASPECT_RATIOS, ASSET_GROUPS, BENTO_SPAN. |
| `src/pages/AiStep2Monitor/theme.js` | Tema visual do monitor (monitorTheme, monitorRadius). |
| `src/lib/color-extractor.js` | Extracao de cores dominantes de imagem (client-side). |

### External Services

| Service | Purpose |
|---------|---------|
| Google Gemini API (NanoBanana) | Geracao de imagem (prompt-to-image). |
| Supabase Storage (`aurea-garden-assets`) | Upload de assets (logo, source, product) e armazenamento de outputs. |
| Supabase DB (`garden_jobs`, `nanobanana_config`) | Persistencia de jobs e configuracao do modelo. |
| Supabase DB (`celebridades`, `segmentos`, `subsegmento`, `negocio`) | Dados de referencia para formularios. |

## Data Flow

```
Frontend (PostGenPage)
  │
  ├── 1. Carrega opcoes via GET get-garden-options
  │
  ├── 2. Usuario preenche formulario + upload de arquivos
  │     ├── Validacao client-side (tipo, tamanho, campos obrigatorios)
  │     └── Extracao de cores do logo (extractColorsFromImage)
  │
  ├── 3. POST multipart/form-data → post-gen-generate
  │     │
  │     ├── 3a. Validacao server-side (formato, imagem, prompt)
  │     ├── 3b. Upload de assets para aurea-garden-assets bucket
  │     │       └── gen/{jobId}/logo.{ext}     (Post Gen)
  │     ├── 3c. INSERT garden_jobs (status: processing)
  │     ├── 3d. Response 202 { job_id, status: processing }
  │     │
  │     └── 3e. [Background] EdgeRuntime.waitUntil:
  │           ├── Load nanobanana_config
  │           ├── Build prompt estruturado (buildPostGenPrompt)
  │           ├── Generate signed URLs para assets uploadados
  │           ├── Call generateImage(prompt, celebritySlot, logoSlot, campaignSlot, referenceSlot)
  │           ├── Upload output para gen/{jobId}/output.png
  │           └── UPDATE garden_jobs (status: completed/failed)
  │
  └── 4. Polling a cada 3s via GET get-garden-job?job_id=...
        ├── completed → exibe imagem + download
        └── failed → exibe erro

Gallery (GardenGalleryPage)
  └── GET list-garden-jobs?tool=...&status=...&page=...&limit=...
      └── Regenera signed URLs para jobs completados (7 dias)
```

## Key Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| Post Gen Generator | `supabase/functions/post-gen-generate/index.ts` | Geracao prompt-to-image com brief estruturado. |
| Garden Validator | `supabase/functions/_shared/garden/validate.ts` | Validacao de formato, imagem (15MB, tipos), prompt (5000 chars). |
| Image Generator | `supabase/functions/_shared/ai-campaign/image-generator.ts` | Interface com Gemini: download de refs, chamada API, retry. |
| NanoBanana Config | tabela `nanobanana_config` | Config do modelo: nome, base URL, retries, directions, format instructions. |
| Garden Jobs | tabela `garden_jobs` | Persistencia de jobs com status, input, output, metricas. |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role para operacoes de storage e DB. |
| `GEMINI_API_KEY` | Sim | Chave da API Gemini (usada pelo image-generator). |
| `VITE_SUPABASE_URL` | Sim (frontend) | URL Supabase exposta ao frontend. |
| `VITE_SUPABASE_ANON_KEY` | Sim (frontend) | Chave anon para frontend. |

Configuracoes adicionais vem de `nanobanana_config` (DB, nao env vars):
- `gemini_model_name`, `gemini_api_base_url`, `max_retries`, `max_image_download_bytes`
- `direction_moderna`, `direction_clean`, `direction_retail`
- `format_1_1`, `format_4_5`, `format_16_9`, `format_9_16`

## Database Tables

### garden_jobs
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | ID do job. |
| `tool` | text | `'post-gen'` (tool ativa). Registros historicos podem ter `'post-turbo'`. |
| `status` | text | `'pending'`, `'processing'`, `'completed'`, `'failed'`. |
| `input_prompt` | text | Prompt do usuario. |
| `input_format` | text | Formato: `'1:1'`, `'4:5'`, `'16:9'`, `'9:16'`. |
| `input_model` | text | Sempre `'nanobanana'`. |
| `input_metadata` | jsonb | Dados especificos por tool (celebrity, segment, palette, etc.). |
| `source_image_path` | text | Path no bucket (logo para Post Gen). |
| `output_image_path` | text | Path do output gerado no bucket. |
| `output_image_url` | text | Signed URL do output (7 dias de validade). |
| `duration_ms` | int | Duracao do processamento em ms. |
| `error_code` | text | Codigo de erro padronizado. |
| `error_message` | text | Mensagem de erro (truncada em 500 chars). |
| `request_id` | uuid | ID de rastreabilidade da request. |
| `created_at` | timestamptz | Data de criacao. |

### Storage: aurea-garden-assets (bucket privado)
| Path Pattern | Tool | Content |
|--------------|------|---------|
| `gen/{jobId}/logo.{ext}` | Post Gen | Logo do cliente. |
| `gen/{jobId}/output.png` | Post Gen | Imagem gerada. |

> Prefixo `turbo/*` e usado apenas por registros historicos do Post Turbo (tool descontinuada em 2026-04-24).

## Error Handling

Codigos de erro padronizados (tipo `ErrorCode` em `validate.ts`):
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_INPUT` | 400 | Validacao falhou (formato, campo obrigatorio, tipo de arquivo). |
| `UPLOAD_ERROR` | 500 | Falha ao salvar asset no bucket. |
| `PROVIDER_ERROR` | — | Gemini retornou erro ou imagem vazia (persiste no job, nao retorna HTTP). |
| `PROVIDER_TIMEOUT` | — | Timeout na chamada Gemini (reservado, nao usado atualmente). |
| `NOT_FOUND` | 404 | Job nao encontrado (get-garden-job). |
| `INTERNAL_ERROR` | 500 | Erro generico. |

## Conventions

- **Async-first**: Edge Functions retornam 202 imediatamente; processamento em `EdgeRuntime.waitUntil()`.
- **Polling pattern**: Frontend faz polling a cada 3s via `get-garden-job`. Sem WebSocket.
- **Signed URLs**: Output URLs tem validade de 7 dias. A galeria regenera URLs ao listar.
- **Signed URLs temporarias**: Assets de input (para o Gemini) usam signed URLs de 600s (10 min).
- **Multipart form-data**: O gerador Post Gen aceita multipart.
- **Paleta como JSON**: Campo `palette` e enviado como string JSON parseable (`JSON.parse(paletteRaw)`).
- **Prompt max 5000 chars**, imagem max 15 MB, tipos aceitos: PNG, JPEG, WebP.
- **Config-driven**: Directions criativas e format instructions vem de `nanobanana_config`, nao hardcoded.
- **Texto em PT-BR**: Instrucao final do prompt forca "Text must be in Brazilian Portuguese".

## Known Limitations

1. **Sem autenticacao nas Edge Functions Garden**: As funcoes nao usam `requireAuth`. Sao publicas (deploy com `--no-verify-jwt`).
2. **Sem rate limiting**: Nao ha controle de taxa de requisicoes por usuario ou IP.
3. **Polling sem timeout**: O frontend faz polling indefinidamente ate `completed` ou `failed`. Nao ha timeout client-side.
4. **Signed URL expiration**: Se o usuario abrir a galeria apos 7 dias, a imagem aparece quebrada ate o proximo list (que regenera URLs).
5. **Placeholder image hack**: Post Gen sem logo usa `https://placehold.co/1x1.png` como placeholder para slots obrigatorios do `generateImage()`.
6. **Error message truncation**: `error_message` e truncada em 500 chars no catch generico.
7. **Sem retry automatico**: Jobs falhados nao sao reprocessados automaticamente.
