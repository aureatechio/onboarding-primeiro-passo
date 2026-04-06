# functionSpec: post-gen-generate

## Goal

Gerar criativos publicitarios (prompt-to-image) a partir de um brief estruturado com celebridade, segmento, estilo, paleta de cores e prompt do usuario. Retorna imediatamente (202) e processa em background.

## HTTP

- **Method:** POST
- **Content-Type:** `multipart/form-data` (com logo) ou `application/json` (sem logo)
- **Auth:** Publica (deploy com `--no-verify-jwt`)

## Inputs

### Form Fields (obrigatorios)

| Field | Type | Validation |
|-------|------|------------|
| `celebrity_name` | string | Non-empty |
| `format` | string | `1:1`, `4:5`, `16:9`, `9:16` |
| `segment` | string | Non-empty |
| `subsegment` | string | Non-empty |
| `business` | string | Non-empty |
| `style` | string | Non-empty |
| `prompt` | string | Non-empty, max 5000 chars |

### Form Fields (opcionais)

| Field | Type | Validation |
|-------|------|------------|
| `logo` | File | PNG/JPEG/WebP, max 15 MB |
| `palette` | string (JSON) | Array de strings hex (max 5 cores) |
| `city` | string | — |
| `state` | string | — |
| `briefing` | string | — |

## Behavior

1. Valida todos os campos obrigatorios e o logo (se presente).
2. Cria Supabase client com `SUPABASE_SERVICE_ROLE_KEY`.
3. Gera `jobId` (UUID) e `requestId` (UUID).
4. Se logo presente: upload para `aurea-garden-assets` em `gen/{jobId}/logo.{ext}`.
5. INSERT em `garden_jobs` com `status: 'processing'`, `tool: 'post-gen'`.
6. Retorna 202 com `{ job_id, status: 'processing', request_id }`.
7. **Background (`EdgeRuntime.waitUntil`):**
   a. Carrega `nanobanana_config`.
   b. Gera signed URL do logo (10 min).
   c. Monta prompt via `buildPostGenPrompt()` (CREATIVE BRIEF → PALETTE → DIRECTION → FORMAT → PROMPT → MANDATORY).
   d. Chama `generateImage(prompt, placeholderOrLogo, logoOrPlaceholder)`.
   e. Se sucesso: upload output em `gen/{jobId}/output.png`, signed URL 7 dias, UPDATE job `completed`.
   f. Se falha: UPDATE job `failed` com `error_code` e `error_message`.

## Prompt Structure

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
{direction_moderna from config}

---

FORMAT ({format}):
{format instruction from config}

---

USER PROMPT:
{prompt}

---

MANDATORY: Generate a professional advertising creative following ALL instructions above. Text must be in Brazilian Portuguese. Output a single image.
```

## Error Handling

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `INVALID_INPUT` | Campo obrigatorio ausente, formato invalido, tipo de arquivo invalido |
| 500 | `UPLOAD_ERROR` | Falha ao salvar logo no bucket |
| 500 | `INTERNAL_ERROR` | Falha ao inserir job ou excecao generica |

Erros de geracao (background) nao retornam HTTP — ficam no job:
- `PROVIDER_ERROR` — Gemini falhou
- `UPLOAD_ERROR` — falha ao salvar output
- `INTERNAL_ERROR` — excecao generica

## Observability

- Log `[post-gen.request]`: request_id, format, celebrity, has_logo, palette_count, prompt_length
- Log `[post-gen.generation-failed]`: request_id, error, duration_ms
- Log `[post-gen.output-upload-error]`: request_id, error message
- Log `[post-gen.complete]`: request_id, job_id, duration_ms
- Log `[post-gen.error]`: request_id, error (excecao generica)

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

- Direction default e SEMPRE `direction_moderna` (ver BUSINESS-RULES.md regra 3)
- Sem logo: slots de imagem usam `placehold.co/1x1.png` como placeholder (regra 6)
- Config vem de `nanobanana_config`, nao de env vars (regra 5)
- Palette e JSON string no form-data (regra 7)

## Deploy

```bash
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
