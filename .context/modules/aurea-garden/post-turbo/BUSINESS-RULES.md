# Post Turbo — Regras de Negocio Criticas

Regras especificas do Post Turbo que complementam as regras gerais do Aurea Garden (`../BUSINESS-RULES.md`).

## 1. Multipart Obrigatorio

Post Turbo EXIGE `multipart/form-data`. Qualquer outro content-type retorna 400 imediatamente. Isso porque a imagem base e obrigatoria e nao pode ser enviada via JSON.

**Contraste com Post Gen:** Post Gen aceita `application/json` para submissoes sem logo.

**Fonte:** `post-turbo-generate/index.ts` (validacao de content-type)

## 2. Direction Selecionavel com Auto-Fill

O usuario escolhe entre 3 directions: `moderna`, `clean`, `retail`. Ao selecionar, o campo prompt e auto-preenchido com o texto da direction do `nanobanana_config` (`config.direction_{direction}`).

O usuario pode editar o prompt pre-preenchido livremente. O backend usa o prompt como enviado — nao re-resolve da config.

**Frontend:** `PostTurboPage.jsx` → `handleDirectionChange()` busca `nanobanana_config` e preenche o textarea.

**Fonte:** `post-turbo-generate/index.ts`, `PostTurboPage.jsx`

## 3. Celebrity com Imagem Real

Quando uma celebridade e selecionada, Post Turbo busca `fotoPrincipal` na tabela `celebridades` (filtro: `nome = celebrityName AND ativo = true`). A URL da foto e passada como `celebrityPngUrl` para o `generateImage()`.

**Fallback:** Se nao encontrar a celebridade (ou sem selecao), o slot de celebridade usa a imagem base (source) como fallback.

**Contraste com Post Gen:** Post Gen NAO busca imagem de celebridade — apenas inclui o nome como texto no brief.

**Sacred Face Rule:** Aplica-se diretamente no Post Turbo porque a imagem real da celebridade e enviada ao Gemini. O prompt deve instruir "NAO alterar pixels, expressao, pele ou features da pessoa".

**Fonte:** `post-turbo-generate/index.ts` (linhas ~254-265)

## 4. Sistema de 5 Slots de Imagem

Post Turbo usa TODOS os 5 parametros posicionais do `generateImage()`:

| Slot | Parametro | Origem | Fallback |
|------|-----------|--------|----------|
| 1 | `celebrityPngUrl` | `celebridades.fotoPrincipal` | Source image signed URL |
| 2 | `clientLogoUrl` | Logo uploaded signed URL | Source image signed URL |
| 3 | `campaignImageUrl` | Product image signed URL | `undefined` (omitido) |
| 4 | `categoryReferenceImageUrl` | SEMPRE source image signed URL | — |

**Logica:** A imagem base (source) funciona como "ancora visual" — sempre presente no slot 4 (reference) e como fallback nos slots 1 e 2.

**Fonte:** `post-turbo-generate/index.ts` (linhas ~295-299)

## 5. Tres Uploads Possiveis

| Upload | Campo | Obrigatorio | Path Storage |
|--------|-------|-------------|-------------|
| Source (imagem base) | `image` | Sim | `turbo/{jobId}/source.{ext}` |
| Logo | `logo` | Nao | `turbo/{jobId}/logo.{ext}` |
| Produto | `product_image` | Nao | `turbo/{jobId}/product.{ext}` |

Todos sao validados: PNG/JPEG/WebP, max 15 MB. Erros de upload de logo ou product NAO abortam o request — sao logados e ignorados.

**Fonte:** `post-turbo-generate/index.ts`

## 6. Prompt Pre-Preenchido vs Prompt Customizado

Existem 2 cenarios de prompt no Post Turbo:

1. **Auto-fill:** Usuario seleciona direction → prompt preenchido com texto da config → usuario submete sem editar
2. **Customizado:** Usuario seleciona direction → edita o prompt livremente → backend recebe o texto editado

Em ambos os casos, o backend monta o prompt final com a estrutura fixa (CREATIVE DIRECTION → PALETTE → CELEBRITY → FORMAT → USER INSTRUCTIONS → MANDATORY). O campo "USER INSTRUCTIONS" pode conter o mesmo texto da direction ou algo completamente diferente.

**Fonte:** `post-turbo-generate/index.ts` → `buildPostTurboPrompt()`

## 7. Direction Modes (Futuro)

O sistema ja tem tipos para `DirectionMode` (`text` | `image` | `both`) no `nanobanana/config.ts`, mas Post Turbo atualmente usa APENAS o modo `text` (resolve `direction_{dir}` como string).

Campos existentes no config (nao totalmente implementados no Post Turbo):
- `direction_moderna_mode`, `direction_clean_mode`, `direction_retail_mode`
- `direction_moderna_image_path`, `direction_clean_image_path`, `direction_retail_image_path`

**Status:** Infraestrutura de types pronta; implementacao nos endpoints parcial.

**Fonte:** `_shared/nanobanana/config.ts` → `DirectionMode`

## 8. Fallback de Config (Mesmo do Post Gen)

Se `loadNanoBananaConfig()` retornar `null`:
- Direction text fica vazia
- Format instructions usam texto simples
- Modelo usa default hardcoded: `gemini-3-pro-image-preview`

**Fonte:** `post-turbo-generate/index.ts` → fallbacks

## 9. Composicao Hibrida (Planejado)

Ha um plano documentado (`plan/2026-04-07-alavanca-d-composicao-hibrida-celebridade.md`) para substituir o envio da imagem da celebridade ao Gemini por composicao programatica via Sharp (WASM):

1. Gemini gera fundo/layout SEM imagem de celebridade
2. Sharp compoe a celebridade deterministicamente sobre o fundo

**Status:** Planejado, nao implementado. A regra Sacred Face via prompt continua sendo o mecanismo ativo.

**Fonte:** `plan/2026-04-07-alavanca-d-composicao-hibrida-celebridade.md`
