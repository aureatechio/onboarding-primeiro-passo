# Post Gen — Ordem de Leitura por Tarefa

## 1. Melhorar prompts de geracao de imagem

1. `docs/creative-directions.md` — prompts default das 3 directions + formatos
2. `supabase/functions/_shared/ai-campaign/prompt-builder.ts` — como o prompt e montado
3. `supabase/functions/post-gen-generate/index.ts` → `buildPostGenPrompt()` — prompt especifico do Post Gen
4. `supabase/functions/_shared/nanobanana/config.ts` — interface NanoBananaDbConfig (campos de direction e format)
5. `.context/modules/aurea-garden/post-gen/SDD.md` — contrato da funcao

## 2. Corrigir bug na geracao

1. `.context/modules/aurea-garden/post-gen/BUSINESS-RULES.md` — regras criticas
2. `supabase/functions/post-gen-generate/functionSpec.md` — spec completa
3. `supabase/functions/post-gen-generate/index.ts` — implementacao
4. `supabase/functions/_shared/ai-campaign/image-generator.ts` — chamada Gemini + retries
5. `.context/modules/aurea-garden/OPERACAO-AUREA-GARDEN.md` — queries de diagnostico

## 3. Modificar formulario do frontend

1. `src/pages/AiStep2Monitor/PostGenPage.jsx` — componente React
2. `src/pages/AiStep2Monitor/useGardenOptions.js` — hook de opcoes (celebridades, segmentos)
3. `src/pages/AiStep2Monitor/constants.js` — ASPECT_RATIOS, STATUS_META
4. `src/lib/color-extractor.js` — extracao de cores do logo
5. `.context/modules/aurea-garden/BUSINESS-RULES.md` — regras 7 (paleta) e 9 (cascading dropdowns)

## 4. Alterar config NanoBanana (directions/formatos)

1. `supabase/functions/_shared/nanobanana/config.ts` — tipos e loader
2. `supabase/functions/update-nanobanana-config/functionSpec.md` — validacao de campos
3. `supabase/functions/get-nanobanana-config/functionSpec.md` — retorno com signed URLs
4. `.context/modules/aurea-garden/BUSINESS-RULES.md` — regra 5 (config-driven prompts)

## 5. Adicionar novo campo ao brief/prompt

1. `supabase/functions/post-gen-generate/functionSpec.md` — inputs atuais
2. `supabase/functions/post-gen-generate/index.ts` → `buildPostGenPrompt()` — onde campos entram no prompt
3. `src/pages/AiStep2Monitor/PostGenPage.jsx` — form frontend
4. `supabase/functions/_shared/garden/validate.ts` — validacao
5. `docs/creative-directions.md` — contexto das secoes do prompt
