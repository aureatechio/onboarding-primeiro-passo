# Plano — Alavancas A + B: Sacred Face & Aspect Ratio

**Status:** Executado — 2026-04-07  
**Ajuste técnico:** parâmetro é `generationConfig.imageConfig.aspectRatio` (não `generationConfig.aspectRatio` direto) — confirmado via documentação oficial Gemini API.  
**Decisão de escopo:** somente banco (`nanobanana_config`) é fonte de verdade para prompts; fallback hardcoded não foi atualizado.  
**Motivação:** Dois problemas recorrentes na geração de imagens:
1. Pose/roupa da celebridade alterada pelo modelo (**Sacred Face violation**)
2. Proporção da imagem distorcida (**aspect ratio ignorado**)

**Escopo:** `_shared/ai-campaign/image-generator.ts`, `_shared/ai-campaign/prompt-builder.ts`, `nanobanana_config` (migration), `create-ai-campaign-job/index.ts`

---

## Alavanca A — `aspectRatio` nativo na generationConfig

### Causa raiz

O `generationConfig` enviado ao Gemini não inclui o parâmetro `aspectRatio`. O modelo infere a proporção pelo texto do prompt, o que é não-determinístico.

```typescript
// ANTES — sem aspectRatio
generationConfig: {
  responseModalities: ['TEXT', 'IMAGE'],
}
```

A API Gemini (Imagen) aceita `aspectRatio` como parâmetro nativo:
- Valores suportados: `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"`
- Quando presente, o modelo **sempre** respeita a proporção — é tratado como hard constraint pela API, não como instrução textual.

### Mapeamento de formatos

| FormatName (pipeline) | aspectRatio (Gemini API) |
|---|---|
| `1:1` | `"1:1"` |
| `4:5` | `"4:5"` |
| `16:9` | `"16:9"` |
| `9:16` | `"9:16"` |

> **Nota:** `4:5` pode não ser suportado por todas as versões do modelo. Se a API retornar erro, fallback para `"1:1"` com instrução textual reforçada. Verificar na integração.

### Mudanças necessárias

**`_shared/ai-campaign/image-generator.ts`**

- `callGemini()` recebe novo parâmetro `aspectRatio?: string`
- `generateImage()` recebe novo parâmetro `aspectRatio?: string` e repassa para `callGemini()`
- `generationConfig` inclui `aspectRatio` quando fornecido

**`generate-ai-campaign-image/index.ts` (worker)**

- `WorkerBody` adiciona campo `aspect_ratio?: string`
- Passa `aspectRatio` para `generateImage()`

**`create-ai-campaign-job/index.ts` (orquestrador)**

- `dispatchWorkers()` mapeia `asset.format → aspectRatio` e inclui no body do worker
- Mapeamento: `FORMAT_TO_ASPECT_RATIO` constante local

### Checklist Alavanca A

- [ ] Adicionar `aspectRatio?: string` em `GenerateImageOverrides` (`image-generator.ts`)
- [ ] Passar `aspectRatio` para `generationConfig` em `callGemini()`
- [ ] Adicionar `aspect_ratio?: string` em `WorkerBody` (`generate-ai-campaign-image/index.ts`)
- [ ] Criar constante `FORMAT_TO_ASPECT_RATIO` no orquestrador
- [ ] Passar `aspect_ratio` no body do `fetch` para o worker
- [ ] Testar com formato `4:5` — verificar se API aceita ou exige fallback

---

## Alavanca B — Reformulação do Sacred Face no prompt

### Causa raiz

O prompt atual tem as instruções do Sacred Face diluídas em duas posições: dentro do `GLOBAL_RULES` (bloco de regras globais) e implícita nas creative directions ("COLLAGE TECHNIQUE"). O problema é que:

1. O Gemini trata instruções textuais como **orientações com peso relativo**, não como hard constraints
2. As creative directions pedem comportamentos que **conflitam** com o Sacred Face — ex: "Hero framing, 70-80% of the frame" implica que o modelo deve **recriar** a cena, não apenas reposicionar

### Estratégia de reformulação

**Princípio 1 — Separar o que o modelo CRIA do que ele NÃO TOCA**

O prompt precisa ser explícito: o modelo gera background + texto + layout. A celebridade é um ativo físico externo que será composto sobre o resultado.

**Princípio 2 — Reforço duplo: global rules + cada creative direction**

A instrução de Sacred Face deve aparecer tanto nas global rules quanto no cabeçalho de cada creative direction, antes de qualquer instrução de layout.

**Princípio 3 — Remover instruções ambíguas das directions**

Trechos como "Celebrity: Hero framing, 70-80% of the frame" dizem ao modelo *como renderizar* a celebridade. Devem ser substituídos por instruções de **área reservada** (safe zone) — o que o modelo precisa deixar livre, não o que ele deve desenhar.

### Mudanças em `GLOBAL_RULES` (hardcoded + `nanobanana_config.global_rules`)

**Remover:** O bloco atual RULE #1 menciona "COLLAGE TECHNIQUE" mas não é imperativo o suficiente e não proíbe explicitamente a geração da pessoa.

**Substituir por:**

```
## RULE #1 — THE SACRED FACE (ABSOLUTE CONSTRAINT)
⚠️ THIS IS THE HIGHEST PRIORITY RULE. IT OVERRIDES ALL OTHER INSTRUCTIONS.

A photo of the celebrity is provided as an image input. This photo is a LOCKED PIXEL ASSET.

YOU MUST NOT:
- Redraw, reimagine, or recreate the celebrity
- Change their pose, expression, clothing, or body position
- Generate any person from scratch — even if compositionally "similar"

YOU MUST:
- Leave a clear, unobstructed SAFE ZONE in the canvas for the celebrity to be composited later
- Design the background and layout to complement the celebrity's position (described below)

The celebrity will be placed PROGRAMMATICALLY after generation. Your job is to create the BACKGROUND CANVAS only.
```

### Mudanças nas creative directions (por grupo)

**Antes (exemplo `moderna`):**
```
- Celebrity: Hero framing, 70-80% of the frame, cinematic lighting.
```

**Depois:**
```
- Celebrity Safe Zone: Reserve center-to-right area, ~70% of canvas height. Design cinematic lighting on the background to complement a hero figure standing there.
```

Cada grupo recebe uma instrução de safe zone específica, alinhada com as regras de posicionamento da Alavanca D:

| Grupo | Safe Zone instruction |
|---|---|
| `moderna` | Reserve center area, ~75% canvas height, for a standing figure. Background: dark, cinematic. |
| `clean` | Reserve right 60% of canvas for a floating figure on white. Left 40%: text column. |
| `retail` | Reserve right 55% of canvas for a standing figure, may bleed off right edge. Left: bold blocks/badges/CTA. |

### Mudanças em `prompt-builder.ts`

- Atualizar `GLOBAL_RULES` hardcoded com o novo texto
- Atualizar `GROUP_DIRECTIONS` de `moderna`, `clean`, `retail` com as safe zones

### Mudança em `nanobanana_config` (migration)

- Atualizar os campos `global_rules`, `direction_moderna`, `direction_clean`, `direction_retail` no banco com os novos textos
- Bump de versão: `global_rules_version → v1.1.0`, `prompt_version → v1.1.0`

> **Importante:** O bump de versão invalida o `input_hash` de jobs anteriores — próxima chamada a `create-ai-campaign-job` para o mesmo `compra_id` irá gerar um novo job (comportamento correto, pois o prompt mudou).

### Checklist Alavanca B

- [ ] Reescrever `GLOBAL_RULES` em `prompt-builder.ts` com nova Rule #1
- [ ] Reescrever `GROUP_DIRECTIONS.moderna` com safe zone
- [ ] Reescrever `GROUP_DIRECTIONS.clean` com safe zone
- [ ] Reescrever `GROUP_DIRECTIONS.retail` com safe zone
- [ ] Bump `PROMPT_VERSION = 'v1.1.0'` e `GLOBAL_RULES_VERSION = 'v1.1.0'`
- [ ] Criar migration para atualizar `nanobanana_config` com os novos textos e versões
- [ ] Verificar que `FORMAT_INSTRUCTIONS` ainda está correto (não muda nesta alavanca)

---

## Ordem de execução

```
1. Alavanca A (image-generator.ts + worker + orquestrador)
   → menor risco, mudança isolada, testável imediatamente

2. Alavanca B (prompt-builder.ts + migration)
   → muda o hash → próximo job do cliente gera novo lote
   → fazer DEPOIS da A para ter o aspectRatio ativo no primeiro reteste
```

---

## Deploy

Todas as funções envolvidas são **protegidas com service role** — deploy normal sem `--no-verify-jwt`:

```bash
supabase functions deploy create-ai-campaign-job --project-ref awqtzoefutnfmnbomujt
supabase functions deploy generate-ai-campaign-image --project-ref awqtzoefutnfmnbomujt
```

A migration de `nanobanana_config` é executada via `supabase db push` ou pelo MCP `apply_migration`.

---

## Validação pós-deploy

1. Disparar `create-ai-campaign-job` para um `compra_id` existente (ex: `4dd39eb5`)
2. Um novo job deve ser criado (hash diferente por causa do bump de versão)
3. Verificar nos 12 assets gerados:
   - [ ] Pose da celebridade idêntica à foto original (Helen Ganzarolli)
   - [ ] Proporções corretas: 1:1, 4:5, 16:9, 9:16 sem distorção
   - [ ] Safe zones respeitadas (área da celebridade visível no fundo)
   - [ ] Texto em PT-BR
   - [ ] `prompt_version = v1.1.0` nos assets do banco

---

## Relação com Alavanca D

As Alavancas A+B são **mitigações via prompt engineering**. Reduzem significativamente os problemas mas não os eliminam estruturalmente — o modelo ainda pode ocasionalmente desviar.

A **Alavanca D** (composição programática) é a solução definitiva. Spec em:  
`plan/2026-04-07-alavanca-d-composicao-hibrida-celebridade.md`

Recomendação: executar A+B agora → validar qualidade → decidir se D é necessária com base nos resultados.
