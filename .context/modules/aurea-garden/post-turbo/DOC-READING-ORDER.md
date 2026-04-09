# Post Turbo — Ordem de Leitura por Tarefa

## 1. Melhorar prompts de geracao/enhancement

1. `docs/creative-directions.md` — prompts default das 3 directions + formatos + safe zones
2. `supabase/functions/post-turbo-generate/index.ts` → `buildPostTurboPrompt()` — prompt especifico
3. `supabase/functions/_shared/ai-campaign/prompt-builder.ts` — construcao shared
4. `supabase/functions/_shared/nanobanana/config.ts` — interface NanoBananaDbConfig
5. `.context/modules/aurea-garden/post-turbo/SDD.md` — contrato completo

## 2. Corrigir bug na geracao

1. `.context/modules/aurea-garden/post-turbo/BUSINESS-RULES.md` — regras criticas
2. `supabase/functions/post-turbo-generate/functionSpec.md` — spec completa
3. `supabase/functions/post-turbo-generate/index.ts` — implementacao
4. `supabase/functions/_shared/ai-campaign/image-generator.ts` — chamada Gemini + slots
5. `.context/modules/aurea-garden/OPERACAO-AUREA-GARDEN.md` — queries de diagnostico

## 3. Trabalhar na composicao de celebridade

1. `.context/modules/aurea-garden/post-turbo/BUSINESS-RULES.md` — regra 3 (celebrity com imagem)
2. `supabase/functions/post-turbo-generate/index.ts` — resolucao de `fotoPrincipal`
3. `supabase/functions/_shared/ai-campaign/image-generator.ts` — slot mapping
4. `plan/2026-04-07-alavanca-d-composicao-hibrida-celebridade.md` — plano de composicao hibrida
5. `docs/creative-directions.md` — safe zones por direction

## 4. Modificar formulario do frontend

1. `src/pages/AiStep2Monitor/PostTurboPage.jsx` — componente React
2. `src/pages/AiStep2Monitor/useGardenOptions.js` — hook de opcoes
3. `src/pages/AiStep2Monitor/constants.js` — ASPECT_RATIOS, STATUS_META
4. `src/lib/color-extractor.js` — extracao de cores do logo
5. `.context/modules/aurea-garden/BUSINESS-RULES.md` — regras 4 (auto-fill) e 7 (paleta)

## 5. Alterar direction modes (text/image/both)

1. `supabase/functions/_shared/nanobanana/config.ts` — `DirectionMode` type
2. `supabase/functions/post-turbo-generate/index.ts` — como direction mode e consumido
3. `supabase/functions/update-nanobanana-config/functionSpec.md` — como mode e atualizado
4. `supabase/functions/read-nanobanana-reference/functionSpec.md` — leitura de imagem de referencia

## 6. Alterar config NanoBanana (directions/formatos)

1. `supabase/functions/_shared/nanobanana/config.ts` — tipos e loader
2. `supabase/functions/update-nanobanana-config/functionSpec.md` — validacao
3. `supabase/functions/get-nanobanana-config/functionSpec.md` — retorno com signed URLs
4. `.context/modules/aurea-garden/BUSINESS-RULES.md` — regra 5 (config-driven)

## 7. Adicionar novo slot de imagem ou input

1. `supabase/functions/post-turbo-generate/functionSpec.md` — inputs atuais
2. `supabase/functions/post-turbo-generate/index.ts` — upload + slot mapping
3. `supabase/functions/_shared/ai-campaign/image-generator.ts` — assinatura do `generateImage()`
4. `src/pages/AiStep2Monitor/PostTurboPage.jsx` — form frontend
5. `supabase/functions/_shared/garden/validate.ts` — validacao de imagem
