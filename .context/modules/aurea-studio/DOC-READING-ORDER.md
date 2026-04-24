# Aurea Garden — Ordem de Leitura por Tipo de Tarefa

Leia SEMPRE o README.md primeiro. Depois, conforme o tipo de tarefa:

## Implementar ou corrigir geracao de imagem (Post Gen)
1. `.context/modules/aurea-garden/README.md` (visao geral, data flow)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regras criticas)
3. `supabase/functions/post-gen-generate/functionSpec.md`
4. `supabase/functions/_shared/garden/validate.ts` (validacoes compartilhadas)
5. `.cursor/skills/aurea-garden/SKILL.md` (playbook completo)

## Ajustar prompt engineering (qualidade de output, instrucoes, directions)
1. `.context/modules/aurea-garden/README.md` (secao Conventions)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regras 3, 5, 6)
3. `supabase/functions/post-gen-generate/index.ts` → funcao `buildPostGenPrompt()`
4. Tabela `nanobanana_config` (directions e format instructions sao config-driven)

## Debugar job falhado ou lento
1. `.context/modules/aurea-garden/README.md` (secao Error Handling)
2. `.context/modules/aurea-garden/OPERACAO-AUREA-GARDEN.md` (runbook)
3. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regra 8 — error codes)
4. Logs da Edge Function: prefixos `[post-gen.*]`
5. Tabela `garden_jobs` — colunas `error_code`, `error_message`, `duration_ms`

## Modificar formulario do frontend (campos, validacao, UX)
1. `.context/modules/aurea-garden/README.md` (secao Scope — frontend files)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regras 1, 2, 7, 9)
3. `src/pages/AiStep2Monitor/PostGenPage.jsx`
4. `src/pages/AiStep2Monitor/useGardenOptions.js` (hook de opcoes)
5. `src/pages/AiStep2Monitor/constants.js` (formatos, directions, aspect ratios)

## Trabalhar na galeria (listagem, filtros, lightbox)
1. `.context/modules/aurea-garden/README.md` (secao Data Flow — Gallery)
2. `supabase/functions/list-garden-jobs/functionSpec.md`
3. `src/pages/AiStep2Monitor/GardenGalleryPage.jsx`
4. `src/pages/AiStep2Monitor/constants.js` (BENTO_SPAN, TOOL_BADGE)

## Configuracao do modelo NanoBanana (directions, formato, retries)
1. `.context/modules/aurea-garden/README.md` (secao Environment Variables — config DB)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regra 5 — config-driven prompts)
3. `supabase/functions/get-nanobanana-config/` e `update-nanobanana-config/`
4. Tabela `nanobanana_config` — colunas relevantes

## Adicionar nova ferramenta ao Garden (ex: Post Remix, Post Edit)
1. `.context/modules/aurea-garden/README.md` (arquitetura completa)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (todas as regras)
3. `.context/modules/aurea-garden/checklist-geral.md` (padrao de completude)
4. `supabase/functions/post-gen-generate/functionSpec.md` (como referencia de contrato)
5. `supabase/functions/_shared/garden/validate.ts` (validacoes reutilizaveis)
6. `src/pages/AiStep2Monitor/MonitorLayout.jsx` (navegacao sidebar)
7. `.cursor/skills/aurea-garden/SKILL.md`

## Schema ou migration (garden_jobs, nanobanana_config)
1. `.context/modules/aurea-garden/README.md` (secao Database Tables)
2. `.context/modules/aurea-garden/BUSINESS-RULES.md` (regra 10 — nunca editar migrations existentes)
3. `supabase/migrations/` — verificar ultima migration existente
