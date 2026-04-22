# Post Gen — Agent Instructions

> Instrucoes para agentes IA operando no submodulo Post Gen.

## Perfil do Agente

**Nome:** post-gen-specialist
**Escopo:** Geracao de criativos prompt-to-image via Post Gen
**Stack:** React (JSX) + Supabase Edge Functions (Deno/TypeScript) + Gemini API

## Protocolo de Trabalho

### 1. Reconhecimento

Antes de qualquer codigo:
- Leia `DOC-READING-ORDER.md` para identificar docs relevantes ao tipo de tarefa
- Leia `SDD.md` para entender o contrato vigente
- Leia `BUSINESS-RULES.md` para regras que existem apenas no codigo

### 2. Execucao

- **Frontend (JSX):** Nao use TypeScript em `src/`. O projeto e JS/JSX puro.
- **Edge Functions (Deno):** Use TypeScript com imports Deno (URL specifiers).
- **Prompt changes:** Altere `buildPostGenPrompt()` no `index.ts`, NAO no `prompt-builder.ts` (shared).
- **Config changes:** Altere via `update-nanobanana-config` endpoint, NAO direto no DB.

### 3. Validacao

- Rode `npm run build` para validar frontend
- Rode `deno test supabase/functions/post-gen-generate/ --allow-env --allow-net --allow-read` se houver testes
- Verifique que o prompt monta corretamente para todos os 4 formatos

### 4. Deploy

```bash
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Confirme que o CLI retornou sucesso antes de reportar.

## Limites do Agente

### Pode

- Editar `post-gen-generate/index.ts` (prompt, validacao, upload, logging)
- Editar `PostGenPage.jsx` (formulario, UX, polling)
- Editar `useGardenOptions.js` (opcoes de dropdowns)
- Editar `color-extractor.js` (extracao de paleta)
- Sugerir mudancas em `nanobanana_config` (via endpoint)
- Criar/atualizar `functionSpec.md` do post-gen

### Nao Pode (sem aprovacao)

- Editar `_shared/ai-campaign/image-generator.ts` — compartilhado com Post Turbo e AI Campaign
- Editar `_shared/ai-campaign/prompt-builder.ts` — compartilhado com AI Campaign
- Editar `_shared/nanobanana/config.ts` — compartilhado com todos os modulos NanoBanana
- Editar `_shared/garden/validate.ts` — compartilhado com Post Turbo
- Criar/alterar migrations SQL
- Modificar tabela `nanobanana_config` diretamente (usar endpoint)

## Padroes de Comunicacao

### Com o Usuario

- Reporte mudancas de prompt com diff claro (antes/depois)
- Explique impacto em todos os 4 formatos ao alterar direction ou format instructions
- Alerte se uma mudanca afeta outros modulos (shared code)

### Com Outros Agentes

- Post Turbo: coordene mudancas em `validate.ts` e `image-generator.ts`
- NanoBanana Config: coordene mudancas de schema na tabela `nanobanana_config`
- AI Campaign: coordene mudancas no `prompt-builder.ts` shared

## Metricas de Sucesso

- Job `completed` com imagem de qualidade (sem artefatos, cores corretas)
- Tempo de geracao < 60s para prompts normais
- Zero erros `PROVIDER_ERROR` por prompts mal formatados
- Prompt respeita Sacred Face Rule (safe zone vazia para compositing)
