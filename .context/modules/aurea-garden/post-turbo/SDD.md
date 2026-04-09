# Post Turbo — SDD (Spec Driven Development)

> Contrato tecnico do `post-turbo-generate`. Fonte de verdade para implementacao e validacao.

## Identidade

| Campo | Valor |
|-------|-------|
| Funcao | `post-turbo-generate` |
| Tipo | Edge Function (Deno) |
| Method | POST |
| Content-Type | `multipart/form-data` (obrigatorio) |
| Auth | Publica (`--no-verify-jwt`) |
| Padrao | Async (202 + background processing) |

## Contrato de Entrada

### Campos Obrigatorios

| Field | Type | Validation | Uso |
|-------|------|------------|-----|
| `image` | File | PNG/JPEG/WebP, max 15 MB | Imagem base (source) |
| `direction` | string | `moderna` \| `clean` \| `retail` | Seleciona direction criativa |
| `format` | string | `1:1` \| `4:5` \| `16:9` \| `9:16` | Formato do output |

### Campos Opcionais

| Field | Type | Validation | Uso |
|-------|------|------------|-----|
| `prompt` | string | Texto livre | Pre-preenchido com direction text; editavel |
| `celebrity_name` | string | Nome existente na tabela `celebridades` | Resolve `fotoPrincipal` para slot de imagem |
| `logo` | File | PNG/JPEG/WebP, max 15 MB | Logo da marca (extrai cores) |
| `product_image` | File | PNG/JPEG/WebP, max 15 MB | Imagem de produto |
| `palette` | string (JSON) | Array hex, max 5 | Cores da marca |

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
  "tool": "post-turbo",
  "status": "completed",
  "output_image_url": "signed URL (7 dias)",
  "duration_ms": 12345,
  "input_format": "4:5",
  "input_metadata": { "direction": "moderna", "celebrity_name": "...", "has_logo": true, ... },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## Prompt Contract

```
CREATIVE DIRECTION ({direction}):
{nanobanana_config.direction_{direction}}

---

BRAND PALETTE: #hex1, #hex2, ...

---

CELEBRITY: {celebrity_name}

---

FORMAT ({format}):
{nanobanana_config.format_{format_key}}

---

USER INSTRUCTIONS:
{prompt}

---

MANDATORY: Enhance and improve this base image into a professional advertising creative
following ALL directions above. Use the brand logo and palette if provided.
Text must be in Brazilian Portuguese. Output a single image.
```

### Mapeamento Config → Prompt

| Config Key | Prompt Section | Fallback |
|------------|----------------|----------|
| `direction_moderna` / `direction_clean` / `direction_retail` | CREATIVE DIRECTION | String vazia |
| `format_1_1` / `format_4_5` / `format_16_9` / `format_9_16` | FORMAT | `FORMAT: {format}` |
| `gemini_model_name` | N/A (modelo API) | `gemini-3-pro-image-preview` |
| `max_retries` | N/A (retries internos) | `2` |

## Image Slots Contract

| Parametro `generateImage()` | Origem | Fallback | Signed URL TTL |
|------------------------------|--------|----------|----------------|
| `prompt` | Prompt montado (6 secoes) | — | — |
| `celebrityPngUrl` | `celebridades.fotoPrincipal` | Source signed URL | 10 min |
| `clientLogoUrl` | Logo signed URL | Source signed URL | 10 min |
| `campaignImageUrl` | Product signed URL | `undefined` | 10 min |
| `categoryReferenceImageUrl` | SEMPRE source signed URL | — | 10 min |

### Resolucao de Celebrity

```
1. Se celebrity_name fornecido:
   SELECT fotoPrincipal FROM celebridades WHERE nome = {name} AND ativo = true LIMIT 1
   
2. Se encontrou: celebritySlot = fotoPrincipal URL
3. Se NAO encontrou: celebritySlot = source image signed URL
4. Se celebrity_name NAO fornecido: celebritySlot = source image signed URL
```

## Storage Contract

| Asset | Path | Validade |
|-------|------|----------|
| Source image (input) | `aurea-garden-assets/turbo/{jobId}/source.{ext}` | Permanente |
| Logo (input) | `aurea-garden-assets/turbo/{jobId}/logo.{ext}` | Permanente |
| Product (input) | `aurea-garden-assets/turbo/{jobId}/product.{ext}` | Permanente |
| Output (resultado) | `aurea-garden-assets/turbo/{jobId}/output.png` | Permanente |
| Signed URLs (para Gemini) | — | 10 minutos |
| Signed URL (para frontend) | — | 7 dias |

## Error Contract

### Erros Sincronos (HTTP)

| HTTP | Code | Condicao |
|------|------|----------|
| 400 | `INVALID_INPUT` | Content-type nao multipart, imagem ausente, direction invalida, formato invalido |
| 500 | `UPLOAD_ERROR` | Falha ao salvar source/logo/product no bucket |
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
| `[post-turbo.request]` | request_id, format, direction, has_celebrity, has_logo, has_product, palette_count, prompt_length, image_size |
| `[post-turbo.complete]` | request_id, job_id, duration_ms |
| `[post-turbo.generation-failed]` | request_id, error, duration_ms |
| `[post-turbo.logo-upload-error]` | request_id, error |
| `[post-turbo.product-upload-error]` | request_id, error |
| `[post-turbo.output-upload-error]` | request_id, error |
| `[post-turbo.error]` | request_id, error (excecao) |

## Deploy

```bash
supabase functions deploy post-turbo-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
