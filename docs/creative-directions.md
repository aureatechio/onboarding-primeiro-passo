# Direções Criativas — NanoBanana

Prompts de direção criativa usados no pipeline de geração de imagens IA (Post Gen / Post Turbo).

Fonte: `supabase/functions/_shared/ai-campaign/prompt-builder.ts` (`GROUP_DIRECTIONS`)

Os valores abaixo são os **defaults hardcoded**. Podem ser sobrescritos via painel NanoBanana (tabela `nanobanana_config`, campos `direction_moderna`, `direction_clean`, `direction_retail`).

---

## Moderna — Dark & Bold

> Referência: Nike / pôster de filme

```
CREATIVE DIRECTION — MODERNA (Dark & Bold)
⚠️ SACRED FACE RULE APPLIES: Do NOT draw or render the celebrity. Leave the safe zone empty for compositing.
- Background: Black / dark solid, cinematic gradient.
- Celebrity Safe Zone: Reserve center area, ~75% of canvas height, for a standing figure. Design cinematic lighting on the background to complement a hero figure standing there.
- Layout: Asymmetric, safe zone dominates, text anchored at the bottom.
- Typography: Ultra-bold condensed, impactful, max contrast.
- Reference mood: Nike campaign poster / movie poster aesthetic.
```

| Atributo     | Descrição                                                               |
| ------------ | ----------------------------------------------------------------------- |
| Fundo        | Preto / escuro sólido, gradiente cinematográfico                       |
| Safe Zone    | Área central, ~75% da altura do canvas, reservada para figura em pé   |
| Layout       | Assimétrico, safe zone domina, texto na base                           |
| Tipografia   | Ultra-bold condensed, impactante, máximo contraste                     |
| Referência   | Nike campaign poster / movie poster aesthetic                           |

---

## Clean — White & Editorial

> Referência: Vogue / anúncio Apple

```
CREATIVE DIRECTION — CLEAN (White & Editorial)
⚠️ SACRED FACE RULE APPLIES: Do NOT draw or render the celebrity. Leave the safe zone empty for compositing.
- Background: Pure white.
- Celebrity Safe Zone: Reserve right 60% of canvas for a floating figure on white. Design subtle editorial shadows to complement a figure positioned there.
- Layout: Editorial split — left 40%: text column with generous whitespace.
- Typography: Light or regular serif/sans-serif with generous whitespace.
- Reference mood: Vogue editorial / Apple product ad aesthetic.
```

| Atributo     | Descrição                                                                  |
| ------------ | -------------------------------------------------------------------------- |
| Fundo        | Branco puro                                                                |
| Safe Zone    | 60% direito do canvas reservado para figura flutuante                     |
| Layout       | Split editorial — esquerda 40%: coluna de texto com muito espaço          |
| Tipografia   | Light/regular serif ou sans-serif, muito espaço                           |
| Referência   | Vogue editorial / Apple product ad aesthetic                               |

---

## Retail — Bold & Commercial

> Referência: Casas Bahia / Magazine Luiza

```
CREATIVE DIRECTION — RETAIL (Bold & Commercial)
⚠️ SACRED FACE RULE APPLIES: Do NOT draw or render the celebrity. Leave the safe zone empty for compositing.
- Background: Solid brand color.
- Celebrity Safe Zone: Reserve right 55% of canvas for a standing figure, may bleed off right edge. Design the background to complement a standing cut-out figure there.
- Layout: Left side: hard geometric blocks, badges, price callouts, CTA.
- Typography: All-caps condensed, maximum contrast, scannable CTA.
- Reference mood: Casas Bahia / Magazine Luiza promotional ad aesthetic.
```

| Atributo     | Descrição                                                                        |
| ------------ | -------------------------------------------------------------------------------- |
| Fundo        | Cor sólida da marca                                                              |
| Safe Zone    | 55% direito do canvas reservado para figura em pé, pode sangrar na borda direita |
| Layout       | Esquerda: blocos geométricos, badges, price callouts, CTA                        |
| Tipografia   | All-caps condensed, máximo contraste, CTA escaneável                            |
| Referência   | Casas Bahia / Magazine Luiza promotional ad aesthetic                            |

---

## Formatos de saída disponíveis

Definidos em `FORMAT_INSTRUCTIONS` no mesmo arquivo:

| Formato | Resolução    | Composição                                          |
| ------- | ------------ | --------------------------------------------------- |
| `1:1`   | 1080×1080 px | Quadrado, composição centralizada                   |
| `4:5`   | 1080×1350 px | Retrato vertical, CTA na base                       |
| `16:9`  | 1920×1080 px | Paisagem, texto à esquerda, celebridade à direita   |
| `9:16`  | 1080×1920 px | Story vertical, celebridade no topo, CTA no terço inferior |
