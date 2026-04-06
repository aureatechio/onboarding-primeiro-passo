# functionSpec: post-turbo-generate

## Goal

Turbinar uma imagem existente com direcao criativa, branding e IA. Recebe imagem base + direction + formato, processa em background e retorna 202.

## HTTP

- **Method:** POST
- **Content-Type:** `multipart/form-data` (obrigatorio — rejeita outros content-types)
- **Auth:** Publica (deploy com `--no-verify-jwt`)

## Inputs

### Form Fields (obrigatorios)

| Field | Type | Validation |
|-------|------|------------|
| `image` | File | PNG/JPEG/WebP, max 15 MB |
| `direction` | string | `moderna`, `clean`, `retail` |
| `format` | string | `1:1`, `4:5`, `16:9`, `9:16` |

### Form Fields (opcionais)

| Field | Type | Validation |
|-------|------|------------|
| `prompt` | string | Texto livre (pre-preenchido com direction text no frontend) |
| `celebrity_name` | string | Nome da celebridade (busca fotoPrincipal no DB) |
| `logo` | File | PNG/JPEG/WebP, max 15 MB |
| `product_image` | File | PNG/JPEG/WebP, max 15 MB |
| `palette` | string (JSON) | Array de strings hex (max 5 cores) |

## Behavior

1. Valida content-type (DEVE ser `multipart/form-data`).
2. Valida imagem (obrigatoria), direction (enum), formato, logo e product_image (se presentes).
3. Cria Supabase client com `SUPABASE_SERVICE_ROLE_KEY`.
4. Gera `jobId` e `requestId`.
5. Upload de source image para `turbo/{jobId}/source.{ext}`.
6. Upload de logo (se presente) para `turbo/{jobId}/logo.{ext}`.
7. Upload de product_image (se presente) para `turbo/{jobId}/product.{ext}`.
8. INSERT em `garden_jobs` com `status: 'processing'`, `tool: 'post-turbo'`.
9. Retorna 202 com `{ job_id, status: 'processing', request_id }`.
10. **Background (`EdgeRuntime.waitUntil`):**
    a. Carrega `nanobanana_config`.
    b. Resolve direction text: `config.direction_{direction}`.
    c. Se celebrity_name: busca `fotoPrincipal` em `celebridades` (nome + ativo = true).
    d. Gera signed URLs para source, logo, product (10 min).
    e. Monta prompt via `buildPostTurboPrompt()`.
    f. Mapeia slots de imagem:
       - `celebritySlot` = celebrity URL OU source URL
       - `logoSlot` = logo URL OU source URL
       - `campaignSlot` = product URL (se fornecida)
       - `referenceSlot` = SEMPRE source URL
    g. Chama `generateImage(prompt, celebritySlot, logoSlot, campaignSlot, referenceSlot)`.
    h. Se sucesso: upload output em `turbo/{jobId}/output.png`, signed URL 7 dias, UPDATE job `completed`.
    i. Se falha: UPDATE job `failed`.

## Prompt Structure

```
CREATIVE DIRECTION ({direction}):
{direction text from config}

---

BRAND PALETTE: #hex1, #hex2, ...

---

CELEBRITY: {celebrity_name}

---

FORMAT ({format}):
{format instruction from config}

---

USER INSTRUCTIONS:
{prompt}

---

MANDATORY: Enhance and improve this base image into a professional advertising creative following ALL directions above. Use the brand logo and palette if provided. Text must be in Brazilian Portuguese. Output a single image.
```

## Error Handling

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `INVALID_INPUT` | Content-type nao multipart, imagem ausente, direction invalida, formato invalido |
| 500 | `UPLOAD_ERROR` | Falha ao salvar source/logo/product no bucket |
| 500 | `INTERNAL_ERROR` | Falha ao inserir job ou excecao generica |

Erros de geracao (background):
- `PROVIDER_ERROR` — Gemini falhou
- `UPLOAD_ERROR` — falha ao salvar output
- `INTERNAL_ERROR` — excecao generica

## Observability

- Log `[post-turbo.request]`: request_id, format, direction, has_celebrity, has_logo, has_product, palette_count, prompt_length, image_size
- Log `[post-turbo.generation-failed]`: request_id, error, duration_ms
- Log `[post-turbo.logo-upload-error]`: request_id, error
- Log `[post-turbo.product-upload-error]`: request_id, error
- Log `[post-turbo.output-upload-error]`: request_id, error
- Log `[post-turbo.complete]`: request_id, job_id, duration_ms
- Log `[post-turbo.error]`: request_id, error

## Example Response (202)

```json
{
  "success": true,
  "data": {
    "job_id": "a1b2c3d4-...",
    "status": "processing",
    "request_id": "e5f6g7h8-..."
  }
}
```

## Regras de Negocio Criticas

- Direction text vem de `nanobanana_config`, NAO hardcoded (ver BUSINESS-RULES.md regra 5)
- Slot mapping: celebridade e logo fazem fallback para source image (regra 6)
- Celebrity image resolve de `celebridades.fotoPrincipal` (regra 10)
- EXIGE multipart/form-data — rejeita JSON (regra 14)

## Deploy

```bash
supabase functions deploy post-turbo-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
