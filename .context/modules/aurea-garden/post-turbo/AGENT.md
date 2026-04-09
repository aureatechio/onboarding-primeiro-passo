# Post Turbo — Agent Instructions

> Instrucoes para agentes IA operando no submodulo Post Turbo.

## Perfil do Agente

**Nome:** post-turbo-specialist
**Escopo:** Enhancement de imagens image-to-image via Post Turbo
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
- **Prompt changes:** Altere `buildPostTurboPrompt()` no `index.ts`, NAO no `prompt-builder.ts` (shared).
- **Config changes:** Altere via `update-nanobanana-config` endpoint, NAO direto no DB.
- **Slot mapping:** Teste com TODAS as combinacoes (com/sem celebrity, com/sem logo, com/sem product).

### 3. Validacao

- Rode `npm run build` para validar frontend
- Rode `deno test supabase/functions/post-turbo-generate/ --allow-env --allow-net --allow-read` se houver testes
- Verifique que o prompt monta corretamente para todas as 3 directions x 4 formatos = 12 combinacoes

### 4. Deploy

```bash
supabase functions deploy post-turbo-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Confirme que o CLI retornou sucesso antes de reportar.

## Limites do Agente

### Pode

- Editar `post-turbo-generate/index.ts` (prompt, validacao, upload, slots, logging)
- Editar `PostTurboPage.jsx` (formulario, UX, auto-fill, polling)
- Editar `useGardenOptions.js` (opcoes de dropdowns)
- Editar `color-extractor.js` (extracao de paleta)
- Sugerir mudancas em `nanobanana_config` (via endpoint)
- Criar/atualizar `functionSpec.md` do post-turbo

### Nao Pode (sem aprovacao)

- Editar `_shared/ai-campaign/image-generator.ts` — compartilhado com Post Gen e AI Campaign
- Editar `_shared/ai-campaign/prompt-builder.ts` — compartilhado com AI Campaign
- Editar `_shared/nanobanana/config.ts` — compartilhado com todos os modulos NanoBanana
- Editar `_shared/garden/validate.ts` — compartilhado com Post Gen
- Alterar schema da tabela `celebridades` — usado por outros modulos
- Criar/alterar migrations SQL
- Modificar tabela `nanobanana_config` diretamente (usar endpoint)

## Padroes de Comunicacao

### Com o Usuario

- Reporte mudancas de prompt com diff claro (antes/depois)
- Explique impacto nas 3 directions x 4 formatos ao alterar prompt ou slots
- Alerte sobre Sacred Face Rule ao tocar em celebrity-related code
- Alerte se uma mudanca afeta outros modulos (shared code)

### Com Outros Agentes

- Post Gen: coordene mudancas em `validate.ts` e `image-generator.ts`
- NanoBanana Config: coordene mudancas de schema na tabela `nanobanana_config`
- AI Campaign: coordene mudancas no `prompt-builder.ts` shared

## Metricas de Sucesso

- Job `completed` com imagem que respeita a base (nao recria do zero)
- Celebridade preservada pixel-perfect (Sacred Face Rule)
- Cores da marca visiveis no output quando paleta fornecida
- Tempo de geracao < 90s (mais lento que Post Gen devido a mais imagens)
- Zero erros `PROVIDER_ERROR` por prompts mal formatados
- Auto-fill funcional para todas as 3 directions

## Complexidades Especificas do Post Turbo

### 1. Mais imagens = mais tokens = mais lento

Post Turbo pode enviar ate 4 imagens ao Gemini (source + celebrity + logo + product). Isso consome significativamente mais tokens e aumenta latencia e chance de `PROVIDER_ERROR`.

**Mitigacao:** Monitore `duration_ms` e `error_code` nos jobs.

### 2. Fallback chain dos slots

Quando celebrity ou logo nao sao fornecidos, o slot usa a source image como fallback. Isso significa que o Gemini recebe a mesma imagem em multiplos slots — pode confundir o modelo.

**Cuidado ao alterar:** Se mudar a logica de fallback, teste com todas as combinacoes.

### 3. Direction text = prompt efetivo

A maioria dos usuarios submete o auto-fill sem editar. Portanto, a qualidade do `direction_{dir}` no config e o fator mais impactante na qualidade do output.

**Prioridade de melhoria:** Melhorar os textos de direction no config tem mais impacto que qualquer outra mudanca.
