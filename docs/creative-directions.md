# Direções Criativas — NanoBanana

Prompts de direção criativa usados no pipeline de geração de imagens IA (Post Gen / Post Turbo).

Fonte: `supabase/functions/_shared/ai-campaign/prompt-builder.ts` (`GROUP_DIRECTIONS`)

Os valores abaixo são os **defaults hardcoded**. Podem ser sobrescritos via painel NanoBanana (tabela `nanobanana_config`, campos `direction_moderna`, `direction_clean`, `direction_retail`).

---

## Moderna — Dark & Bold

> Referência: Nike / pôster de filme

```
CREATIVE DIRECTION — MODERNA (Dark & Bold)
- Background: Black / dark solid.
- Celebrity: Hero framing, 70-80% of the frame, cinematic lighting.
- Layout: Asymmetric, photo dominates, text anchored at the bottom.
- Typography: Ultra-bold condensed, impactful, max contrast.
- Reference mood: Nike campaign poster / movie poster aesthetic.
```

| Atributo     | Descrição                                      |
| ------------ | ---------------------------------------------- |
| Fundo        | Preto / escuro sólido                          |
| Celebridade  | Herói 70–80% do frame, iluminação cinematográfica |
| Layout       | Assimétrico, foto domina, texto na base        |
| Tipografia   | Ultra-bold condensed, impactante, máximo contraste |
| Referência   | Nike campaign poster / movie poster aesthetic  |

---

## Clean — White & Editorial

> Referência: Vogue / anúncio Apple

```
CREATIVE DIRECTION — CLEAN (White & Editorial)
- Background: Pure white.
- Celebrity: Clean photo floating on white, positioned at the right side.
- Layout: Editorial split 30/70 with a text column on the left.
- Typography: Light or regular serif/sans-serif with generous whitespace.
- Reference mood: Vogue editorial / Apple product ad aesthetic.
```

| Atributo     | Descrição                                         |
| ------------ | ------------------------------------------------- |
| Fundo        | Branco puro                                       |
| Celebridade  | Foto limpa flutuando no branco, canto direito     |
| Layout       | Split editorial 30/70 com coluna de texto à esquerda |
| Tipografia   | Light/regular serif ou sans-serif, muito espaço  |
| Referência   | Vogue editorial / Apple product ad aesthetic      |

---

## Retail — Bold & Commercial

> Referência: Casas Bahia / Magazine Luiza

```
CREATIVE DIRECTION — RETAIL (Bold & Commercial)
- Background: Solid brand color.
- Celebrity: Cut-out standing, right side, breaking out of the frame.
- Layout: Hard geometric blocks, badges, price callouts if applicable.
- Typography: All-caps condensed, maximum contrast, scannable CTA.
- Reference mood: Casas Bahia / Magazine Luiza promotional ad aesthetic.
```

| Atributo     | Descrição                                              |
| ------------ | ------------------------------------------------------ |
| Fundo        | Cor sólida da marca                                    |
| Celebridade  | Cut-out em pé, lado direito, quebra a moldura          |
| Layout       | Geométrico duro, blocos e badges                       |
| Tipografia   | All-caps condensed, máximo contraste, CTA escaneável   |
| Referência   | Casas Bahia / Magazine Luiza promotional ad aesthetic  |

---

## Formatos de saída disponíveis

Definidos em `FORMAT_INSTRUCTIONS` no mesmo arquivo:

| Formato | Resolução    | Composição                                          |
| ------- | ------------ | --------------------------------------------------- |
| `1:1`   | 1080×1080 px | Quadrado, composição centralizada                   |
| `4:5`   | 1080×1350 px | Retrato vertical, CTA na base                       |
| `16:9`  | 1920×1080 px | Paisagem, texto à esquerda, celebridade à direita   |
| `9:16`  | 1080×1920 px | Story vertical, celebridade no topo, CTA no terço inferior |
