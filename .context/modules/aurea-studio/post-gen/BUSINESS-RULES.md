# Post Gen — Regras de Negocio Criticas

Regras especificas do Post Gen que complementam as regras gerais do Aurea Garden (`../BUSINESS-RULES.md`).

## 1. Direction Fixa: Sempre Moderna

Post Gen NAO oferece seletor de direction. A direction e sempre `direction_moderna` do `nanobanana_config`. Isso e intencional — o brief estruturado (celebridade, segmento, estilo) ja guia o tom criativo.

**Impacto:** Mudancas no prompt de `direction_moderna` afetam TODOS os criativos Post Gen.

**Fonte:** `post-gen-generate/index.ts` → `buildPostGenPrompt()`

## 2. Prompt de 6 Secoes

O prompt Post Gen tem estrutura fixa de 6 blocos separados por `\n\n---\n\n`:

```
CREATIVE BRIEF → BRAND PALETTE → CREATIVE DIRECTION → FORMAT → USER PROMPT → MANDATORY
```

A ordem importa: o Gemini prioriza instrucoes no inicio do prompt. O MANDATORY no final serve como "guardrail".

**Fonte:** `post-gen-generate/index.ts` → `buildPostGenPrompt()`

## 3. Celebridade como Texto (nao Imagem)

No Post Gen, a celebridade entra no prompt apenas como TEXTO no bloco CREATIVE BRIEF (`Celebrity: {nome}`). NAO ha busca de `fotoPrincipal` na tabela `celebridades`.

**Implicacao para Sacred Face Rule:** Como nao ha imagem de referencia, o Gemini gera a celebridade do zero — a regra Sacred Face nao se aplica diretamente ao Post Gen.

**Fonte:** `post-gen-generate/index.ts`

## 4. Aceita JSON (unico no Garden)

Post Gen e o unico endpoint Garden que aceita `application/json` alem de `multipart/form-data`. Isso permite submissoes sem logo via JSON simples.

**Quando usar JSON:** Chamadas programaticas (scripts, testes, pipeline) sem upload de arquivo.

**Fonte:** `post-gen-generate/index.ts` → deteccao de content-type

## 5. Slots de Imagem Minimais

Post Gen usa apenas 2 dos 5 slots do `generateImage()`:

| Slot | Valor |
|------|-------|
| `celebrityPngUrl` | Logo signed URL ou `placehold.co/1x1.png` |
| `clientLogoUrl` | Logo signed URL ou `placehold.co/1x1.png` |
| `campaignImageUrl` | `undefined` |
| `categoryReferenceImageUrl` | `undefined` |

**Consequencia:** O Gemini recebe no maximo 1 imagem real (o logo). A geracao e quase puramente text-driven.

**Fonte:** `post-gen-generate/index.ts` (linhas ~230-236)

## 6. Fallback de Config

Se `loadNanoBananaConfig()` retornar `null` (config nao encontrada):
- Directions ficam vazias (string vazia no prompt)
- Format instructions usam texto simples: `FORMAT: {format}`
- Modelo usa default hardcoded: `gemini-3-pro-image-preview`
- Max retries usa default: `2`

**Risco:** Sem config, a qualidade do prompt degrada significativamente.

**Fonte:** `post-gen-generate/index.ts` → fallbacks no `buildPostGenPrompt()`

## 7. Paleta no Brief vs Paleta Visual

A paleta de cores entra no prompt como TEXTO (`BRAND PALETTE: #hex1, #hex2, ...`), nao como imagem de referencia. O Gemini interpreta os hex codes e tenta aplicar as cores ao criativo.

**Limitacao:** A fidelidade de cores depende da interpretacao do modelo — nao ha garantia de match exato.

**Fonte:** `post-gen-generate/index.ts` → bloco BRAND PALETTE no prompt
