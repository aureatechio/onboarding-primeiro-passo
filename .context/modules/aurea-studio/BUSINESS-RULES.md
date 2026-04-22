# Aurea Garden — Regras de Negocio Criticas

Regras que existem no codigo e NAO estao (ou estao parcialmente) documentadas em functionSpecs.
Consulte este arquivo antes de qualquer implementacao ou correcao no modulo Aurea Garden.

## 1. Formatos Validos e Aspect Ratios

**Regra:** Somente 4 formatos sao aceitos: `1:1`, `4:5`, `16:9`, `9:16`. Qualquer outro valor retorna erro `INVALID_INPUT`.

**Mapeamento frontend (CSS aspect-ratio):**
- `1:1` → `1 / 1`
- `4:5` → `4 / 5`
- `16:9` → `16 / 9`
- `9:16` → `9 / 16`

**Bento grid (galeria):** `16:9` ocupa `span 2` horizontal; `4:5` e `9:16` ocupam `span 2` vertical.

**Fonte:** `_shared/garden/validate.ts` (VALID_FORMATS), `constants.js` (ASPECT_RATIOS, BENTO_SPAN)

## 2. Limite de Imagem e Tipos Aceitos

**Regra:** Imagem max 15 MB. Tipos aceitos: `image/png`, `image/jpeg`, `image/webp`.

**Validacao:** Ocorre tanto no frontend (antes do submit) quanto no backend (`validateImageFile()`). A validacao backend e a fonte de verdade.

**MIME → Extensao:** `jpeg/jpg` → `.jpg`, `webp` → `.webp`, fallback → `.png` (funcao `mimeToExt()`).

**Fonte:** `_shared/garden/validate.ts` (MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES), `PostGenPage.jsx`, `PostTurboPage.jsx`

## 3. Post Gen — Direction Default e Prompt Building

**Regra:** Post Gen SEMPRE usa `direction_moderna` como direcao criativa default. Nao ha seletor de direction no frontend do Post Gen.

**Estrutura do prompt (buildPostGenPrompt):**
1. CREATIVE BRIEF (celebrity, business, segment/subsegment, style, location, briefing)
2. BRAND PALETTE (cores hex, se fornecidas)
3. CREATIVE DIRECTION (direction_moderna do config)
4. FORMAT (format instruction do config, ex: `format_1_1`)
5. USER PROMPT (texto livre do usuario)
6. MANDATORY (instrucao final: "professional advertising creative", "Brazilian Portuguese")

**Separador de secoes:** `\n\n---\n\n`

**Fonte:** `post-gen-generate/index.ts` → `buildPostGenPrompt()`

## 4. Post Turbo — Directions Selecionaveis e Auto-Fill

**Regra:** Post Turbo oferece 3 directions: `moderna`, `clean`, `retail`. Ao selecionar uma direction, o campo prompt e auto-preenchido com o texto da direction correspondente do `nanobanana_config`.

**Resolucao:** `direction_${direction}` como chave na tabela `nanobanana_config`.

**Fonte:** `post-turbo-generate/index.ts`, `PostTurboPage.jsx` → `handleDirectionChange()`

## 5. Config-Driven Prompts (NanoBanana Config)

**Regra:** Todas as instructions de direction e formato vem de `nanobanana_config` (tabela). NAO sao hardcoded.

**Chaves de config usadas no prompt:**
- `direction_moderna`, `direction_clean`, `direction_retail` — texto criativo por direction
- `format_1_1`, `format_4_5`, `format_16_9`, `format_9_16` — instrucoes por formato
- `gemini_model_name` — modelo Gemini a usar
- `gemini_api_base_url` — URL base da API
- `max_retries` — retries na geracao (default: 2)
- `max_image_download_bytes` — limite de download de imagens de referencia

**Fallback:** Se config nao carrega (`null`), directions ficam vazias e format usa texto simples (`FORMAT: 1:1`).

**Fonte:** `post-gen-generate/index.ts`, `post-turbo-generate/index.ts` → `loadNanoBananaConfig()`

## 6. Post Turbo — Mapeamento de Slots de Imagem

**Regra:** A funcao `generateImage()` espera 5 parametros posicionais de imagem: `(prompt, celebrityPngUrl, clientLogoUrl, campaignImageUrl?, categoryReferenceImageUrl?)`.

**Mapeamento Post Turbo:**
- `celebritySlot` = URL da celebridade (da tabela `celebridades.fotoPrincipal`) OU imagem base (signed URL)
- `logoSlot` = logo uploadado (signed URL) OU imagem base (signed URL)
- `campaignSlot` = imagem de produto (signed URL), se fornecida
- `referenceSlot` = SEMPRE a imagem base (signed URL) — serve como referencia visual principal

**Mapeamento Post Gen:**
- `celebritySlot` = logo signed URL OU `https://placehold.co/1x1.png` (placeholder)
- `logoSlot` = logo signed URL OU `https://placehold.co/1x1.png` (placeholder)
- Demais slots: `undefined`

**Fonte:** `post-turbo-generate/index.ts` (linhas 295-299), `post-gen-generate/index.ts` (linhas 230-236)

## 7. Paleta de Cores — Extracao e Limite

**Regra:** Maximo 5 cores na paleta. Cores sao automaticamente extraidas do logo (client-side via `extractColorsFromImage`) + cores manuais adicionadas pelo usuario via color picker.

**Transporte:** Palette e serializada como JSON string no campo `palette` do form data. Backend faz `JSON.parse()`.

**Placeholder `__temp__`:** Enquanto o color picker esta aberto, uma entrada temporaria `'__temp__'` e adicionada ao array e filtrada antes do submit.

**Fonte:** `PostGenPage.jsx`, `PostTurboPage.jsx`, `lib/color-extractor.js`

## 8. Error Codes Padronizados

**Regra:** Todo erro retornado segue o formato `{ success: false, code: ErrorCode, message: string }`.

**Codigos:**
| Code | Quando |
|------|--------|
| `INVALID_INPUT` | Validacao de campos, formato, tipo de arquivo. |
| `UPLOAD_ERROR` | Falha ao salvar no bucket (source, logo, product, output). |
| `PROVIDER_ERROR` | Gemini retornou erro ou nao gerou imagem. |
| `PROVIDER_TIMEOUT` | Reservado para timeout Gemini (nao implementado). |
| `NOT_FOUND` | Job nao encontrado (get-garden-job). |
| `INTERNAL_ERROR` | Qualquer excecao generica. |

**Truncation:** `error_message` no job e truncada em 500 caracteres (`errMsg.substring(0, 500)`).

**Fonte:** `_shared/garden/validate.ts` (tipo ErrorCode), `post-gen-generate/index.ts`, `post-turbo-generate/index.ts`

## 9. Cascading Dropdowns (Post Gen)

**Regra:** Segmento → Subsegmento → Negocio sao filtros em cascata. Ao trocar segmento, subsegmento e negocio resetam. Ao trocar subsegmento, negocio reseta.

**IDs vs Nomes:** Dropdowns usam IDs (`segmentId`, `subsegmentId`, `businessId`) internamente, mas o submit envia NOMES resolvidos (via lookup no array de opcoes).

**Fonte:** `PostGenPage.jsx` → `handleSegmentChange()`, `handleSubsegmentChange()`, `getSegmentName()`, etc.

## 10. Celebridade — Resolucao de Imagem (Post Turbo)

**Regra:** Quando uma celebridade e selecionada no Post Turbo, o backend busca `fotoPrincipal` na tabela `celebridades` (filtro: `nome = celebrityName AND ativo = true`). Se encontrada, a URL e usada no slot de celebridade do `generateImage()`.

**Se nao encontrada:** Usa a imagem base (source) como fallback para o slot de celebridade.

**Post Gen:** NAO busca imagem de celebridade — celebridade vai apenas como texto no brief.

**Fonte:** `post-turbo-generate/index.ts` (linhas 254-265)

## 11. Signed URLs — Validades Distintas

**Regra:** Existem duas validades de signed URL no sistema:
- **Output (resultado):** 7 dias (`7 * 24 * 60 * 60` = 604800 segundos)
- **Input (para Gemini):** 10 minutos (600 segundos) — usadas apenas durante o processamento

**Galeria regenera:** `list-garden-jobs` regenera signed URLs de 7 dias para jobs completados a cada chamada.

**Fonte:** `post-gen-generate/index.ts` (URL_EXPIRY_SECONDS), `list-garden-jobs/index.ts`

## 12. Edge Functions Publicas (sem JWT)

**Regra:** TODAS as Edge Functions do Garden sao publicas. Deploy com `--no-verify-jwt`. NAO usam `requireAuth()`.

**Impacto:** Qualquer pessoa com a URL pode criar jobs ou listar a galeria. Nao ha controle de acesso.

**Deploy:** `supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt`

**Fonte:** Observacao do codigo — nenhuma funcao importa `requireAuth` de `_shared/auth.ts`.

## 13. Listagem — Paginacao e Defaults

**Regra:**
- Default page: 1
- Default limit: 20, max limit: 50
- Default status filter: `completed`
- Default tool filter: `all`
- Ordem: `created_at DESC`

**Validacao:** `tool` aceita `all`, `post-turbo`, `post-gen`. `status` aceita `all`, `pending`, `processing`, `completed`, `failed`.

**Fonte:** `list-garden-jobs/index.ts`

## 14. Post Turbo — Content-Type Obrigatorio

**Regra:** Post Turbo EXIGE `multipart/form-data`. Se receber outro content-type, retorna 400 imediatamente.

**Post Gen:** Aceita tanto `multipart/form-data` (com logo) quanto `application/json` (sem logo).

**Fonte:** `post-turbo-generate/index.ts` (linha 109), `post-gen-generate/index.ts` (linhas 115-130)

## 15. Storage Path Convention

**Regra:** Assets sao organizados por tool e jobId:
- Post Gen: `gen/{jobId}/logo.{ext}`, `gen/{jobId}/output.png`
- Post Turbo: `turbo/{jobId}/source.{ext}`, `turbo/{jobId}/logo.{ext}`, `turbo/{jobId}/product.{ext}`, `turbo/{jobId}/output.png`

**Bucket:** `aurea-garden-assets` (privado, sem acesso publico).

**Fonte:** `post-gen-generate/index.ts`, `post-turbo-generate/index.ts`, `_shared/garden/validate.ts` (BUCKET_NAME)

## 16. Regeneracao de Assets Completed

**Regra:** Assets com status `completed` podem ser regenerados (nao apenas `failed`). A regeneracao reseta o asset para `pending`, limpa `image_url`/`width`/`height`, e re-dispara o pipeline com o mesmo prompt. A variacao no resultado depende do nao-determinismo do modelo Gemini.

**Modos suportados:**
- `mode = single`: regenera 1 asset individual (por `asset_id`), aceita `completed` ou `failed`
- `mode = category`: regenera todos os 4 formatos de uma categoria (`group_name`), aceita `completed` ou `failed`
- `mode = failed`: mantido — retries apenas assets `failed` (retrocompativel)

**Guard:** `JOB_BUSY` impede regeneracao enquanto houver assets `pending`/`processing` no job.

**Fonte:** `retry-ai-campaign-assets/index.ts`
