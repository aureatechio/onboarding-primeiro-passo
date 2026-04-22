# Post Gen — SDD (Spec Driven Development)

> Contrato tecnico do `post-gen-generate`. Fonte de verdade para implementacao e validacao.

## Identidade

| Campo | Valor |
|-------|-------|
| Funcao | `post-gen-generate` |
| Tipo | Edge Function (Deno) |
| Method | POST |
| Content-Type | `multipart/form-data` ou `application/json` |
| Auth | Publica (`--no-verify-jwt`) |
| Padrao | Async (202 + background processing) |

## Contrato de Entrada

### Campos Obrigatorios

| Field | Type | Validation | Prompt Section |
|-------|------|------------|----------------|
| `celebrity_name` | string | Non-empty | CREATIVE BRIEF |
| `format` | string | `1:1` \| `4:5` \| `16:9` \| `9:16` | FORMAT |
| `segment` | string | Non-empty | CREATIVE BRIEF |
| `subsegment` | string | Non-empty | CREATIVE BRIEF |
| `business` | string | Non-empty | CREATIVE BRIEF |
| `style` | string | Non-empty | CREATIVE BRIEF |
| `prompt` | string | Non-empty, max 5000 chars | USER PROMPT |

### Campos Opcionais

| Field | Type | Validation | Prompt Section |
|-------|------|------------|----------------|
| `logo` | File | PNG/JPEG/WebP, max 15 MB | Imagem inline (Gemini) |
| `palette` | string (JSON) | Array hex, max 5 | BRAND PALETTE |
| `city` | string | — | CREATIVE BRIEF |
| `state` | string | — | CREATIVE BRIEF |
| `briefing` | string | — | CREATIVE BRIEF |

## Contrato de Saida

### Resposta Sincrona (202)

```json
{
  "success": true,
  "data": {
    "job_id": "UUID",
    "status": "processing",
    "request_id": "UUID"
  }
}
```

### Resultado Assincrono (via get-garden-job)

```json
{
  "job_id": "UUID",
  "tool": "post-gen",
  "status": "completed",
  "output_image_url": "signed URL (7 dias)",
  "duration_ms": 12345,
  "input_format": "4:5",
  "input_metadata": { "celebrity_name": "...", "segment": "...", ... },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Prompt Contract

```
CREATIVE BRIEF:
- Celebrity: {celebrity_name}
- Business: {business}
- Segment: {segment} / {subsegment}
- Style: {style}
- Location: {city}, {state}
- Additional context: {briefing}

---

BRAND PALETTE: #hex1, #hex2, ...

---

CREATIVE DIRECTION:
{nanobanana_config.direction_moderna}

---

FORMAT ({format}):
{nanobanana_config.format_{format_key}}

---

USER PROMPT:
{prompt}

---

MANDATORY: Generate a professional advertising creative following ALL instructions above.
Text must be in Brazilian Portuguese. Output a single image.
```

### Mapeamento Config → Prompt

| Config Key | Prompt Section | Fallback |
|------------|----------------|----------|
| `direction_moderna` | CREATIVE DIRECTION | String vazia |
| `format_1_1` / `format_4_5` / `format_16_9` / `format_9_16` | FORMAT | `FORMAT: {format}` |
| `gemini_model_name` | N/A (modelo da API) | `gemini-3-pro-image-preview` |
| `max_retries` | N/A (retries internos) | `2` |

## Image Slots

| Parametro `generateImage()` | Origem | Fallback |
|------------------------------|--------|----------|
| `prompt` | Prompt montado (6 secoes) | — |
| `celebrityPngUrl` | Logo signed URL (10min) | `placehold.co/1x1.png` |
| `clientLogoUrl` | Logo signed URL (10min) | `placehold.co/1x1.png` |
| `campaignImageUrl` | N/A | `undefined` |
| `categoryReferenceImageUrl` | N/A | `undefined` |

## Storage Contract

| Asset | Path | Validade |
|-------|------|----------|
| Logo (input) | `aurea-garden-assets/gen/{jobId}/logo.{ext}` | Permanente |
| Output (resultado) | `aurea-garden-assets/gen/{jobId}/output.png` | Permanente |
| Logo signed URL (para Gemini) | — | 10 minutos |
| Output signed URL (para frontend) | — | 7 dias |

## Error Contract

### Erros Sincronos (HTTP)

| HTTP | Code | Condicao |
|------|------|----------|
| 400 | `INVALID_INPUT` | Campo obrigatorio ausente, formato invalido, tipo de arquivo invalido |
| 500 | `UPLOAD_ERROR` | Falha ao salvar logo no bucket |
| 500 | `INTERNAL_ERROR` | Falha ao inserir job ou excecao generica |

### Erros Assincronos (no job)

| Code | Condicao |
|------|----------|
| `PROVIDER_ERROR` | Gemini nao retornou imagem |
| `UPLOAD_ERROR` | Falha ao salvar output no bucket |
| `INTERNAL_ERROR` | Excecao generica no background |

## Observability

| Log Tag | Campos |
|---------|--------|
| `[post-gen.request]` | request_id, format, celebrity, has_logo, palette_count, prompt_length |
| `[post-gen.complete]` | request_id, job_id, duration_ms |
| `[post-gen.generation-failed]` | request_id, error, duration_ms |
| `[post-gen.output-upload-error]` | request_id, error message |
| `[post-gen.error]` | request_id, error (excecao) |

## Deploy

```bash
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
