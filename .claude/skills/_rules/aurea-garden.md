---
description: Obrigar consulta de documentacao e uso de skills em temas Aurea Garden (Post Gen, Post Turbo, Galeria)
alwaysApply: false
globs:
  - "supabase/functions/post-gen-*/**"
  - "supabase/functions/post-turbo-*/**"
  - "supabase/functions/list-garden-*/**"
  - "supabase/functions/get-garden-*/**"
  - "supabase/functions/_shared/garden/**"
  - "src/pages/AiStep2Monitor/**"
  - ".context/modules/aurea-studio/**"
---

# Aurea Garden: Post Gen & Post Turbo (Geracao de Criativos IA)

## Gate obrigatorio ANTES de agir

1. **Identificar tipo de tarefa** e consultar ordem de leitura:
   - Ler `.context/modules/aurea-studio/DOC-READING-ORDER.md` — identifica quais docs sao obrigatorios para o tipo de tarefa
   - Ler `.context/modules/aurea-studio/BUSINESS-RULES.md` — regras de negocio criticas

2. **Ler docs na ordem indicada pelo DOC-READING-ORDER:**
   - SEMPRE: `.context/modules/aurea-studio/README.md`
   - Condicional: docs especificos do tipo de tarefa (ver DOC-READING-ORDER)
   - functionSpec da funcao alvo: `supabase/functions/<funcao>/functionSpec.md`

3. **Selecionar skill:**
   - Geracao, prompt, UX, galeria: `.cursor/skills/aurea-garden/SKILL.md`
   - Config NanoBanana: mesma skill + funcoes `get-nanobanana-config` / `update-nanobanana-config`

4. **Responder com base em evidencia:**
   - Citar documentacao consultada
   - Diferenciar: regra AUREA vs comportamento Gemini vs estado real (banco/logs)
   - Todas as Edge Functions Garden sao publicas (`--no-verify-jwt`)

## Funcoes Edge Aurea Garden

**Geracao:** `post-gen-generate`, `post-turbo-generate`
**Consulta:** `list-garden-jobs`, `get-garden-options`, `get-garden-job`
**Config:** `get-nanobanana-config`, `update-nanobanana-config`

## Frontend

**Pages:** `PostGenPage.jsx`, `PostTurboPage.jsx`, `GardenGalleryPage.jsx`
**Layout:** `MonitorLayout.jsx` (sidebar Garden section)
**Shared:** `useGardenOptions.js`, `constants.js`, `theme.js`
**Util:** `lib/color-extractor.js`
