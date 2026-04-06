# Aurea Garden — Checklist de Implementacao

## A. Post Gen (prompt-to-image)

- [x] Edge Function `post-gen-generate` com processamento async — `supabase/functions/post-gen-generate/index.ts`
- [x] Validacao server-side (formato, prompt, imagem) — `_shared/garden/validate.ts`
- [x] Upload de logo para bucket — `post-gen-generate/index.ts`
- [x] Build de prompt estruturado com brief — `buildPostGenPrompt()`
- [x] Integracao com NanoBanana/Gemini via `generateImage()` — `_shared/ai-campaign/image-generator.ts`
- [x] Persistencia em `garden_jobs` com status lifecycle — `post-gen-generate/index.ts`
- [x] Upload de output e signed URL — `post-gen-generate/index.ts`
- [x] Frontend com formulario completo — `PostGenPage.jsx`
- [x] Cascading dropdowns (segmento → subsegmento → negocio) — `PostGenPage.jsx`
- [x] Extracao de paleta de cores do logo — `PostGenPage.jsx` + `lib/color-extractor.js`
- [x] Polling a cada 3s + exibicao de resultado — `PostGenPage.jsx`
- [x] Download de imagem gerada — `PostGenPage.jsx`
- [ ] functionSpec.md para `post-gen-generate`
- [ ] Autenticacao (funcao e publica atualmente)
- [ ] Rate limiting
- [ ] Timeout de polling no frontend

## B. Post Turbo (image-to-image)

- [x] Edge Function `post-turbo-generate` com processamento async — `supabase/functions/post-turbo-generate/index.ts`
- [x] Validacao de imagem obrigatoria + direction + formato — `post-turbo-generate/index.ts`
- [x] Upload de source, logo, product para bucket — `post-turbo-generate/index.ts`
- [x] Build de prompt com direction text do config — `buildPostTurboPrompt()`
- [x] Resolucao de celebridade (fotoPrincipal da tabela) — `post-turbo-generate/index.ts`
- [x] Mapeamento de slots de imagem para `generateImage()` — `post-turbo-generate/index.ts`
- [x] Persistencia em `garden_jobs` — `post-turbo-generate/index.ts`
- [x] Frontend com drag-drop e auto-fill de prompt — `PostTurboPage.jsx`
- [x] Carregamento de directions da config on mount — `PostTurboPage.jsx`
- [x] Upload de imagem de produto opcional — `PostTurboPage.jsx`
- [x] Polling + resultado + download — `PostTurboPage.jsx`
- [ ] functionSpec.md para `post-turbo-generate`
- [ ] Autenticacao
- [ ] Rate limiting

## C. Galeria

- [x] Edge Function `list-garden-jobs` com paginacao e filtros — `supabase/functions/list-garden-jobs/index.ts`
- [x] Regeneracao de signed URLs para jobs completados — `list-garden-jobs/index.ts`
- [x] Frontend com grid, filtros (tool + status), paginacao — `GardenGalleryPage.jsx`
- [x] Lightbox com download — `GardenGalleryPage.jsx`
- [x] Tool badges visuais (Post Turbo azul, Post Gen roxo) — `GardenGalleryPage.jsx`
- [ ] functionSpec.md para `list-garden-jobs`
- [ ] Busca por texto no prompt

## D. Infraestrutura e Shared

- [x] Validacoes compartilhadas (`validate.ts`) — `_shared/garden/validate.ts`
- [x] Bucket `aurea-garden-assets` configurado — Supabase Storage
- [x] Tabela `garden_jobs` com schema completo — `supabase/migrations/`
- [x] Tabela `nanobanana_config` com directions e formats — DB
- [x] Hook `useGardenOptions` para opcoes de referencia — `useGardenOptions.js`
- [x] Constantes centralizadas — `constants.js`
- [x] Navegacao sidebar no MonitorLayout — `MonitorLayout.jsx`
- [x] Rotas configuradas no App.jsx — `/ai-step2/post-turbo`, `/ai-step2/post-gen`, `/ai-step2/gallery`

## E. Observabilidade

- [x] Logs estruturados com prefixo `[post-gen.*]` e `[post-turbo.*]` — Edge Functions
- [x] `request_id` em todos os logs e no `garden_jobs` — Edge Functions
- [x] `duration_ms` registrado em jobs completados e falhados — Edge Functions
- [ ] Alertas para taxa de falha elevada
- [ ] Dashboard de metricas (jobs/dia, success rate, avg duration)

## F. Documentacao e Contexto

- [x] README.md do modulo — `.context/modules/aurea-garden/README.md`
- [x] DOC-READING-ORDER.md — `.context/modules/aurea-garden/DOC-READING-ORDER.md`
- [x] BUSINESS-RULES.md — `.context/modules/aurea-garden/BUSINESS-RULES.md`
- [x] OPERACAO-AUREA-GARDEN.md (runbook) — `.context/modules/aurea-garden/OPERACAO-AUREA-GARDEN.md`
- [x] checklist-geral.md — este arquivo
- [ ] functionSpec.md para todas as Edge Functions Garden
- [ ] Entrada no CONTEXT-MAP.md
- [ ] Cursor rule (.mdc) para gate obrigatorio
- [ ] Cursor skill (SKILL.md) para playbook
