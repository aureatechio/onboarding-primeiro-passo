# Spec — Alavanca D: Composição Híbrida Programática da Celebridade

**Status:** Backlog  
**Prioridade:** Alta (implementar após validar se Alavancas A+B são suficientes)  
**Motivação:** Garantia absoluta (100%) de que a pose/roupa/rosto da celebridade nunca são alterados. As Alavancas A+B reduzem o problema via prompt engineering; a Alavanca D elimina estruturalmente.

---

## Problema que esta spec resolve

O modelo Gemini **gera** imagens — ele não faz composição pixel-a-pixel. Mesmo com instruções claras de "COLLAGE TECHNIQUE / ZERO MODIFICATION", o modelo pode reimaginar a celebridade ao invés de simplesmente reposicioná-la. Isso ocorre porque o processo de geração é estocástico e a instrução textual compite com o aprendizado do modelo sobre como "desenhar pessoas".

A solução definitiva é **remover a responsabilidade de posicionamento da celebridade do modelo de IA** e transferi-la para código determinístico.

---

## Arquitetura proposta

### Fluxo atual

```
[inputs] → buildPrompt() → Gemini (gera tudo) → salva imagem
```

### Fluxo com Alavanca D (duas etapas)

```
[inputs] → buildPrompt() → Gemini (gera fundo + texto + layout) → Sharp/Canvas → composite(celeb PNG) → salva imagem
```

**Etapa 1 — Geração de fundo:** O Gemini recebe o prompt normalmente, mas **sem a imagem da celebridade**. Gera apenas: fundo, layout, tipografia, elementos gráficos, badges, CTA. O prompt instrui explicitamente a deixar uma área reservada ("safe zone") para a celebridade.

**Etapa 2 — Composição programática:** A imagem gerada (fundo) + a foto PNG original da celebridade são compostas via Sharp (Deno/Node). A celebridade é redimensionada e posicionada de acordo com regras determinísticas por grupo/formato.

---

## Regras de posicionamento por grupo × formato

Estas regras são o coração da Alavanca D. Definem onde e como a celebridade é colada, substituindo o que hoje é pedido ao Gemini via prompt.

### Parâmetros por grupo

| Grupo | Posição X | Ancoragem vertical | Tamanho relativo | Comportamento |
|---|---|---|---|---|
| `moderna` | Centro ou leve shift esquerdo | Ocupa 70-80% da altura | 75% da altura do canvas | Sem recorte de borda |
| `clean` | 65% a partir da esquerda (canto direito) | Centralizada verticalmente | 60% da altura do canvas | Sem recorte de borda |
| `retail` | 60% a partir da esquerda, quebrando borda direita | Base alinhada ao fundo do canvas | 80% da altura do canvas | Permite overflow horizontal (celebridade quebra a moldura) |

### Parâmetros por formato (canvas dimensions)

| Formato | Largura | Altura |
|---|---|---|
| `1:1` | 1080 | 1080 |
| `4:5` | 1080 | 1350 |
| `16:9` | 1920 | 1080 |
| `9:16` | 1080 | 1920 |

### Regra de recorte do PNG de origem

A foto da celebridade vem como PNG com fundo transparente (já é um cut-out). O Sharp simplesmente:
1. Redimensiona proporcionalmente (mantém aspect ratio do PNG original)
2. Posiciona no canvas de acordo com as regras acima
3. Compõe com `blend: 'over'` (celebridade sobre o fundo)

Nenhum pixel da celebridade é alterado — apenas redimensionamento proporcional e reposicionamento.

---

## Mudanças necessárias no pipeline

### 1. `_shared/ai-campaign/prompt-builder.ts`

- Remover as instruções de posicionamento da celebridade das creative directions (ex: "Celebrity: Hero framing, 70-80% of the frame")
- Adicionar instrução de "safe zone": cada group direction passa a incluir a área reservada para a celebridade (ex: "Leave the right 60% of the canvas clear for celebrity compositing")
- Manter todas as instruções de fundo, tipografia, layout e CTA

### 2. `_shared/ai-campaign/image-generator.ts`

- Remover a imagem da celebridade dos `imageInputs` enviados ao Gemini
- Adicionar etapa `composeCelebrity()` após o retorno da geração
- Função `composeCelebrity(backgroundImageData, celebrityPngUrl, group, format)` → retorna `Uint8Array` com a imagem final

### 3. `_shared/ai-campaign/compositor.ts` (arquivo novo)

```typescript
// Interface pública
export async function composeCelebrity(
  backgroundData: Uint8Array,
  celebrityPngUrl: string,
  group: GroupName,
  format: FormatName,
): Promise<Uint8Array>

// Posicionamento determinístico
const PLACEMENT_RULES: Record<GroupName, Record<FormatName, PlacementRule>>
```

### 4. `supabase/functions/generate-ai-campaign-image/index.ts`

- `WorkerBody` recebe `celebrity_png_url` como antes (sem mudança de contrato externo)
- Internamente, passa a imagem da celebridade para `composeCelebrity()` em vez de enviá-la ao Gemini

### 5. `nanobanana_config` (migração nova)

- Adicionar campos opcionais de override das regras de posicionamento por grupo:
  - `placement_moderna_json`, `placement_clean_json`, `placement_retail_json`
  - Formato: `{ "x_pct": 0.65, "y_anchor": "center", "height_pct": 0.75, "allow_overflow": false }`
- Permite ajuste fino via painel NanoBanana sem deploy

---

## Dependência de runtime: Sharp em Deno Edge Functions

Sharp é uma biblioteca Node.js. Em Deno/Supabase Edge Functions, as opções são:

**Opção 1 — `@img/sharp-wasm` (recomendada)**  
Versão WebAssembly do Sharp, compatível com Deno:
```typescript
import Sharp from 'npm:@img/sharp-wasm'
```
Sem dependências nativas. Suportado em Edge Functions (testado em Supabase).  
Limitação: ~20-30% mais lento que o Sharp nativo (aceitável para nosso caso — 12 composições/job).

**Opção 2 — Canvas API via `@napi-rs/canvas`**  
Alternativa se Sharp WASM apresentar problemas. Mesma abordagem de composição.

**Opção 3 — Microserviço externo**  
Se Edge Functions tiverem limitações de memória/tempo com imagens grandes: criar uma Edge Function separada `compose-celebrity-image` que só faz composição, chamada pelo worker atual.

---

## Impacto em qualidade

| Aspecto | Antes (prompt only) | Com Alavanca D |
|---|---|---|
| Pose alterada | Possível (~10-15% dos casos) | Impossível (0%) |
| Roupa alterada | Possível | Impossível |
| Proporção da celeb distorcida | Possível | Impossível |
| Layout do fundo alterado | N/A | Gemini controla totalmente |
| Texto em PT-BR | Gemini controla | Gemini controla |
| Fidelidade de cor/marca | Gemini controla | Gemini controla |

**Trade-off:** O Gemini perde contexto visual da celebridade ao gerar o fundo (não vê a foto). Isso pode afetar como ele gera iluminação e sombras do fundo. Mitigação: prompt inclui descrição textual da pose/posicionamento da celebridade para o modelo adaptar a iluminação do fundo.

---

## Critérios de aceite

- [ ] 100% dos 12 assets de um job têm a celebridade com pose idêntica à foto original
- [ ] Redimensionamento proporcional (sem stretch)
- [ ] Regras de posicionamento por grupo/formato respeitadas e configuráveis via NanoBanana
- [ ] Fallback: se `composeCelebrity` falhar, asset é marcado como `failed` (não retorna fundo sem celebridade)
- [ ] Nenhuma mudança no contrato externo das Edge Functions
- [ ] Testes unitários para `compositor.ts` cobrindo os 12 combinações grupo×formato

---

## Pré-requisitos antes de iniciar

1. ✅ Alavancas A+B implementadas e em produção (validar se A+B são suficientes)
2. Testar `@img/sharp-wasm` em Deno local: confirmar compatibilidade com `supabase functions serve`
3. Confirmar que o PNG da celebridade (`fotoPrincipal`) sempre tem fundo transparente no storage — se não tiver, adicionar etapa de remoção de fundo (ex: via Gemini `segmentation` antes da composição)

---

## Estimativa

| Fase | Escopo | Complexidade |
|---|---|---|
| Prova de conceito | `compositor.ts` + Sharp WASM local | Baixa |
| Integração pipeline | Modificar `image-generator.ts` + `prompt-builder.ts` | Média |
| Regras NanoBanana | Migração + painel | Baixa |
| Testes e deploy | 12 combinações + smoke test real | Média |
