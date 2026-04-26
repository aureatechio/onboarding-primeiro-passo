# Mapeamento para remocao do Post Gen

Data do mapeamento: 2026-04-26

Objetivo: identificar arquivos, rotas, Edge Functions, tabelas, buckets e referencias relacionadas ao Post Gen para orientar uma remocao completa e controlada da funcionalidade.

Escopo analisado: codigo local do repositorio. Nao houve consulta ao banco remoto. Onde o schema nao aparece em migrations locais, este documento marca a lacuna explicitamente.

Revisao posterior: uma segunda varredura foi feita com `rg --hidden` para incluir `.agents`, `.claude`, `.codex` e `.context`. Essa revisao adicionou referencias de tooling/docs que nao aparecem em uma busca comum sem arquivos ocultos.

## Resumo executivo

O Post Gen ativo neste repositorio esta exposto em `/ai-step2/post-gen`, nao em `/post-gen`. Ele faz parte do bloco "Aurea Garden" do dashboard AI Step 2.

Fluxo principal:

1. `src/App.jsx` registra a rota `/ai-step2/post-gen`.
2. `MonitorLayout.jsx` exibe o item "Aurea Garden > Post Gen".
3. `PostGenPage.jsx` carrega opcoes por `get-garden-options`.
4. `PostGenPage.jsx` envia `multipart/form-data` para `post-gen-generate`.
5. `post-gen-generate` grava um job em `garden_jobs`, usa `nanobanana_config`, chama Gemini via `_shared/ai-campaign/image-generator.ts` e salva arquivos no bucket `aurea-garden-assets`.
6. `PostGenPage.jsx` faz polling em `get-garden-job`.
7. `GardenGalleryPage.jsx` lista resultados via `list-garden-jobs`.

Remocao provavel se o objetivo for remover somente Post Gen e a galeria Garden:

- Remover rota/imports de `PostGenPage` e `GardenGalleryPage` em `src/App.jsx`.
- Remover navegacao `GARDEN_NAV` em `MonitorLayout.jsx`.
- Apagar `src/pages/AiStep2Monitor/PostGenPage.jsx`.
- Apagar `src/pages/AiStep2Monitor/GardenGalleryPage.jsx`, se a galeria nao tiver outro uso.
- Apagar `src/pages/AiStep2Monitor/useGardenOptions.js`, se nenhuma outra tela passar a usar opcoes Garden.
- Apagar Edge Functions `post-gen-generate`, `get-garden-options`, `get-garden-job`, `list-garden-jobs`.
- Apagar `_shared/garden/validate.ts`, se nenhuma funcao Garden permanecer.
- Criar migration nova para remover `garden_jobs` e artefatos de Storage, depois de confirmar que nao ha historico que precisa ser preservado.
- Remover ou arquivar documentacao Post Gen.

Nao remover automaticamente:

- `supabase/functions/_shared/ai-campaign/image-generator.ts`: usado pelo pipeline AI Campaign.
- `supabase/functions/_shared/nanobanana/config.ts`: usado por `create-ai-campaign-job` e pelas telas/funcoes NanoBanana.
- `nanobanana_config` e bucket `nanobanana-references`: compartilhados com AI Campaign/NanoBanana.
- `src/lib/color-extractor.js`: tambem usado por `src/pages/Etapa62.jsx`.
- `src/pages/AiStep2Monitor/constants.js`: compartilhado pelo monitor de campanha.

## Achados da revisao contra o codigo

Itens que passaram na primeira versao e foram incorporados nesta revisao:

- Arquivos ocultos de agente/tooling: `.agents/skills/_rules/aurea-garden.md`, `.agents/skills/aurea-garden/SKILL.md`, equivalentes em `.claude/`, e prompts em `.codex/prompts/` / `.claude/commands/`.
- `.context/modules/user-management/README.md`: cita permissoes do Post Gen (`admin/operator`).
- `docs/mapeamento-formulario-onboarding.md`: cita `ColorSwatch` no contexto `AiStep2Monitor (PostGen)`.
- `supabase/migrations/20260424100000_onboarding_edit_and_logo_history.sql`: comentario de coluna cita precedencia de `brand_display_name` para `PostGen`.
- Skills operacionais (`nova-tarefa`, `task-enricher`, `sdd-spec-creator`) contem exemplos ou roteamento textual com `post-gen`, `garden` ou `GardenGallery`.

Tambem foi confirmado um desalinhamento importante entre docs e codigo:

- Docs/contextos antigos dizem que todas as Edge Functions Garden sao publicas.
- Codigo atual de `post-gen-generate` usa `requireRole(req, ['admin', 'operator'])` e o frontend chama via `adminFetch`, portanto exige sessao.
- `get-garden-options`, `get-garden-job` e `list-garden-jobs` continuam sem `requireRole` no codigo e sao chamadas com `fetch` direto pelo frontend.

## Rotas e navegacao

| Arquivo | Referencia | Papel | Acao sugerida |
|---|---|---|---|
| `src/App.jsx` | imports `PostGenPage`, `GardenGalleryPage`; rota `/ai-step2/post-gen`; rota `/ai-step2/gallery` | Entrada principal da SPA para Post Gen e Galeria Garden | Remover imports e blocos de rota se a funcionalidade for apagada |
| `src/pages/AiStep2Monitor/MonitorLayout.jsx` | `GARDEN_NAV`; active id `post-gen`/`gallery`; secao "Aurea Garden" | Menu lateral do dashboard | Remover secao Garden ou apenas os itens Post Gen/Galeria |
| `src/pages/AiStep2Monitor/PostGenPage.jsx` | pagina completa | Formulario, validacao client-side, upload de logo, extracao de paleta, submit e polling | Apagar se Post Gen for removido |
| `src/pages/AiStep2Monitor/GardenGalleryPage.jsx` | pagina completa | Galeria de jobs Garden, filtro por `post-gen`, signed URL, lightbox e download | Apagar se nao houver outro produto Garden |

Observacao: `MonitorLayout.jsx` abre `Post Gen` e `Galeria` com `window.open(..., '_blank')`, entao links podem aparecer como abas separadas no uso operacional.

## Frontend

### Arquivos exclusivos ou quase exclusivos

| Arquivo | Uso atual | Dependencias | Acao sugerida |
|---|---|---|---|
| `src/pages/AiStep2Monitor/PostGenPage.jsx` | UI Post Gen | `useGardenOptions`, `ASPECT_RATIOS`, `extractColorsFromImage`, `adminFetch` | Apagar |
| `src/pages/AiStep2Monitor/GardenGalleryPage.jsx` | Galeria Garden com `TOOL_OPTIONS = post-gen` | `list-garden-jobs`, `MonitorLayout`, `monitorTheme` | Apagar se a galeria nao tiver outro uso |
| `src/pages/AiStep2Monitor/useGardenOptions.js` | Hook de opcoes do formulario Post Gen | `get-garden-options` | Apagar se `PostGenPage` sair |

### Arquivos compartilhados com ajustes pontuais

| Arquivo | Como Post Gen aparece | Acao sugerida |
|---|---|---|
| `src/App.jsx` | Importa e renderiza `PostGenPage` e `GardenGalleryPage` | Remover imports e rotas |
| `src/pages/AiStep2Monitor/MonitorLayout.jsx` | Secao `GARDEN_NAV` com `post-gen` e `gallery` | Remover secao Garden ou condicionar a outra feature |
| `src/pages/AiStep2Monitor/constants.js` | `ASPECT_RATIOS` alimenta Post Gen, mas tambem `DetailModePanel` | Manter; nao e exclusivo |
| `src/lib/color-extractor.js` | `PostGenPage` usa `extractColorsFromImage` | Manter, pois `Etapa62.jsx` usa `extractColorsFromFile` do mesmo modulo |
| `src/lib/admin-edge.js` | `PostGenPage` usa `adminFetch('post-gen-generate')` | Manter; usado por usuarios, copy editor, Perplexity, NanoBanana e AI Campaign |
| `src/README.md` | Menciona `GardenGalleryPage`, `PostGenPage`, `useGardenOptions` | Atualizar documentacao apos remocao |

## Edge Functions

### Funcoes diretamente ligadas ao Post Gen/Garden

| Funcao | Arquivos | Papel | Acao sugerida |
|---|---|---|---|
| `post-gen-generate` | `supabase/functions/post-gen-generate/index.ts`, `functionSpec.md` | Cria job `tool='post-gen'`, monta prompt, chama Gemini, salva output | Apagar pasta da function e remover deploy/documentacao |
| `get-garden-options` | `supabase/functions/get-garden-options/index.ts`, `functionSpec.md` | Le `celebridades`, `segmentos`, `subsegmento`, `negocio` para popular dropdowns | Apagar se Post Gen sair |
| `get-garden-job` | `supabase/functions/get-garden-job/index.ts` | Polling de um job em `garden_jobs` e regeneracao de signed URL | Apagar se nao houver outro job Garden |
| `list-garden-jobs` | `supabase/functions/list-garden-jobs/index.ts`, `functionSpec.md` | Galeria paginada de `garden_jobs`, filtro `post-gen`, signed URLs | Apagar se a galeria Garden sair |
| `_shared/garden` | `supabase/functions/_shared/garden/validate.ts` | Validacao Garden (`VALID_FORMATS`, imagem 15 MB, prompt 5000 chars, `BUCKET_NAME`) | Apagar se todas as funcoes Garden forem removidas |

### Dependencias compartilhadas que nao devem ser removidas so por causa do Post Gen

| Arquivo | Uso no Post Gen | Outros consumidores | Acao sugerida |
|---|---|---|---|
| `supabase/functions/_shared/ai-campaign/image-generator.ts` | `post-gen-generate` chama `generateImage()` | AI Campaign (`create-ai-campaign-job`, geracao/retentativas de assets) | Manter |
| `supabase/functions/_shared/nanobanana/config.ts` | `post-gen-generate` carrega config e overrides | `create-ai-campaign-job`, `get-nanobanana-config`, `update-nanobanana-config`, `read-nanobanana-reference` | Manter se AI Campaign/NanoBanana continuam |
| `supabase/functions/_shared/rbac.ts` | `post-gen-generate` exige `admin` ou `operator` | Varias funcoes protegidas | Manter |
| `supabase/functions/_shared/cors.ts` | Todas Garden usam CORS | Compartilhado por muitas Edge Functions | Manter |

### Observacao de autenticacao

A documentacao antiga diz que Garden e publico com `--no-verify-jwt`, mas o codigo atual de `post-gen-generate` chama `requireRole(req, ['admin', 'operator'])`. Isso significa que a remocao deve considerar tambem referencias de RBAC apenas no sentido de nao quebra-las; `rbac.ts` nao e exclusivo do Post Gen.

As outras funcoes Garden (`get-garden-options`, `get-garden-job`, `list-garden-jobs`) nao chamam `requireRole` no codigo atual e usam service role internamente. A galeria e o polling chamam essas funcoes com `fetch` direto.

## Banco de dados e Storage

### Artefatos diretamente ligados ao Post Gen

| Artefato | Uso | Fonte local | Acao sugerida |
|---|---|---|---|
| Tabela `garden_jobs` | Persistencia de jobs Post Gen, status, prompt, metadata, paths, erros e duracao | Referenciada em `post-gen-generate`, `get-garden-job`, `list-garden-jobs`; schema descrito em docs, mas migration de criacao nao existe no checkout atual | Confirmar no banco remoto; criar nova migration para drop/arquivamento se for remover |
| Bucket `aurea-garden-assets` | Armazena `gen/{jobId}/logo.{ext}` e `gen/{jobId}/output.png` | Constante `BUCKET_NAME` em `_shared/garden/validate.ts`; usado pelas funcoes Garden | Confirmar se ha dados historicos; remover bucket/objetos se nao houver retencao necessaria |
| Prefixo Storage `gen/{jobId}/` | Assets Post Gen | `post-gen-generate` | Remover objetos ou manter arquivo historico conforme politica |
| Valores `tool='post-gen'` | Diferenciador dos jobs | `post-gen-generate`, `list-garden-jobs`, `GardenGalleryPage` | Remover junto com `garden_jobs` ou migrar historico antes |

### Tabelas de referencia usadas pelo formulario

| Tabela | Uso no Post Gen | Compartilhamento aparente no codigo local | Acao sugerida |
|---|---|---|---|
| `celebridades` | Dropdown de celebridade em `get-garden-options` | Nao aparece em outras funcoes locais; existe tabela diferente `celebridadesReferencia` usada pelo onboarding/AI Campaign | Validar uso externo antes de dropar |
| `segmentos` | Dropdown de segmento em `get-garden-options` | Tambem usado por onboarding/AI Campaign via outras funcoes | Nao dropar so por remover Post Gen |
| `subsegmento` | Dropdown cascata em `get-garden-options` | Nao aparece em outras funcoes locais | Validar uso externo antes de dropar |
| `negocio` | Dropdown cascata em `get-garden-options` | Nao aparece em outras funcoes locais | Validar uso externo antes de dropar |

### NanoBanana

| Artefato | Relacao com Post Gen | Outros usos | Acao sugerida |
|---|---|---|---|
| Tabela `nanobanana_config` | Prompt/modelo/retries/formats usados por Post Gen | AI Campaign e painel NanoBanana | Manter se a geracao de campanha AI continuar |
| Bucket `nanobanana-references` | Referencias por direction criativa | AI Campaign/NanoBanana | Manter |
| Functions `get/update/read-nanobanana-*` | Config operacional que Post Gen consome | AI Campaign/NanoBanana | Manter salvo se o objetivo for remover toda geracao de imagem NanoBanana |

### Lacuna encontrada nas migrations locais

As migrations locais em `supabase/migrations/` nao criam `garden_jobs`, `aurea-garden-assets`, `nanobanana_config`, `celebridades`, `subsegmento` ou `negocio`. Elas apenas alteram `nanobanana_config` em migrations posteriores.

Implicacao: antes de apagar banco/storage em definitivo, e necessario confirmar no Supabase remoto:

- DDL real de `garden_jobs`.
- Politicas RLS ou grants associados.
- Buckets e objetos existentes.
- Dependencias externas fora deste repositorio.
- Retencao exigida para historico de criativos ja gerados.

## Documentacao e contexto a atualizar/remover

### Documentos Post Gen diretos

| Arquivo | Papel | Acao sugerida |
|---|---|---|
| `docs/post-gen-technical-spec.md` | Spec tecnica independente do Post Gen | Remover ou mover para historico |
| `.context/modules/aurea-studio/post-gen/README.md` | Context engineering do submodulo Post Gen | Remover/arquivar |
| `.context/modules/aurea-studio/post-gen/BUSINESS-RULES.md` | Regras de negocio Post Gen | Remover/arquivar |
| `.context/modules/aurea-studio/post-gen/DOC-READING-ORDER.md` | Ordem de leitura para tarefas Post Gen | Remover/arquivar |
| `.context/modules/aurea-studio/post-gen/SDD.md` | Contrato SDD de `post-gen-generate` | Remover/arquivar |
| `.context/modules/aurea-studio/post-gen/SKILL.md` | Skill local especifico de Post Gen | Remover/arquivar |
| `.context/modules/aurea-studio/post-gen/AGENT.md` | Instrucao local de agente para Post Gen | Remover/arquivar |

### Documentos Aurea Garden/NanoBanana com mencoes

| Arquivo | Mencao | Acao sugerida |
|---|---|---|
| `.context/modules/aurea-studio/README.md` | Define Aurea Garden como Post Gen | Atualizar ou remover modulo se Garden acabar |
| `.context/modules/aurea-studio/BUSINESS-RULES.md` | Regras Post Gen e Garden | Atualizar/remover |
| `.context/modules/aurea-studio/DOC-READING-ORDER.md` | Roteamento por tarefas Garden | Atualizar/remover |
| `.context/modules/aurea-studio/OPERACAO-AUREA-GARDEN.md` | Runbook Garden | Atualizar/remover |
| `.context/modules/aurea-studio/checklist-geral.md` | Checklist de implementacao Garden | Atualizar/remover |
| `CONTEXT-MAP.md` | Secao Aurea Studio/Post Gen | Atualizar |
| `supabase/README.md` | Secao "Aurea Garden (Post Gen)" e shared `garden/` | Atualizar |
| `src/README.md` | Lista subpaginas e hooks Post Gen/Garden | Atualizar |
| `AGENTS.md` | Regras e registry de Aurea Garden/Post Gen | Atualizar apos remocao |
| `.context/modules/user-management/README.md` | Cita acesso do Post Gen para `admin/operator` | Atualizar apos remover rota/permissao |

### Tooling de agentes, skills e prompts

| Arquivo | Tipo de referencia | Acao sugerida |
|---|---|---|
| `.agents/skills/aurea-garden/SKILL.md` | Skill operacional dedicado a Aurea Garden/Post Gen/Post Turbo | Remover/arquivar se Garden acabar |
| `.agents/skills/_rules/aurea-garden.md` | Regra de roteamento para arquivos Garden/Post Gen | Remover/arquivar se Garden acabar |
| `.claude/skills/aurea-garden/SKILL.md` | Copia/variante do skill Aurea Garden | Remover/arquivar se ainda for fonte ativa |
| `.claude/skills/_rules/aurea-garden.md` | Regra Claude para arquivos Garden/Post Gen | Remover/arquivar se ainda for fonte ativa |
| `.agents/skills/nova-tarefa/SKILL.md` | Mapeia `post-gen`/`garden` para dominio `ai-campaign` | Atualizar keyword mapping se Post Gen sair |
| `.agents/skills/task-enricher/SKILL.md` | Mapeia `post-gen`/`garden` para dominio `ai-campaign` | Atualizar keyword mapping se Post Gen sair |
| `.agents/skills/sdd-spec-creator/SKILL.md` | Exemplos citam `post-gen-generate` e `GardenGallery` | Opcional; exemplos podem ser removidos para evitar referencia obsoleta |
| `.claude/skills/nova-tarefa/SKILL.md` | Copia/variante com keyword `post-gen` | Atualizar se ainda for fonte ativa |
| `.claude/skills/task-enricher/SKILL.md` | Copia/variante com keyword `post-gen` | Atualizar se ainda for fonte ativa |
| `.claude/skills/sdd-spec-creator/SKILL.md` | Exemplos citam `post-gen-generate` e `GardenGallery` | Opcional |
| `.codex/prompts/linear-issue.md` | Lista "Aurea Garden (Post Gen)" como projeto tipico | Atualizar se prompts forem mantidos |
| `.claude/commands/linear-issue.md` | Lista "Aurea Garden (Post Gen)" como projeto tipico | Atualizar se comandos forem mantidos |

### Documentos com referencias historicas ou de planejamento

| Arquivo | Tipo de referencia | Acao sugerida |
|---|---|---|
| `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md` | Deploy das funcoes Garden | Atualizar |
| `plan/2026-04-17-fase0-definicao-acesso-dashboard.md` | Plano de acesso incluindo Post Gen/Galeria | Opcional: mover/ajustar se docs ativos |
| `plan/2026-04-19-fase1-fundacao-auth-frontend-dashboard.md` | Rotas `/ai-step2/post-gen` e `/ai-step2/gallery` | Opcional |
| `plan/2026-04-23-onboarding-overview-editavel.md` | Teste cita PostGen | Opcional |
| `plan/historico/2026-04-06-melhoria-modulo-nanobanana.md` | Historico cita `post-gen-generate` | Manter como historico ou anotar descontinuacao |
| `docs/2026-04-17-analise-autenticacao-dashboard.md` | Analise de auth das funcoes Garden | Opcional |
| `docs/fluxo-geracao-imagens-ai-campaign.svg` | Cita Post Gen/Post Turbo como fluxo separado | Atualizar SVG se mantido como doc ativo |
| `relatorio-nanobanana.md` | Cita PostGen como consumidor de NanoBanana | Atualizar |
| `ai-step2/CONTRACT.md` | Cita `post-gen-generate` como consumidor NanoBanana | Atualizar |
| `docs/creative-directions.md` | Descreve directions como usadas no pipeline Post Gen, mas o conteudo tambem serve AI Campaign | Atualizar texto para AI Campaign/NanoBanana |
| `docs/mapeamento-formulario-onboarding.md` | Cita `ColorSwatch` em `AiStep2Monitor (PostGen)` | Atualizar/remover referencia |
| `supabase/migrations/20260424100000_onboarding_edit_and_logo_history.sql` | Comentario da coluna `brand_display_name` cita `PostGen` | Nao editar migration existente; criar migration de comentario se for necessario corrigir docs do banco |

## Contratos atuais do Post Gen

### Entrada de `post-gen-generate`

Campos obrigatorios:

- `celebrity_name`
- `format`: `1:1`, `4:5`, `16:9`, `9:16`
- `segment`
- `subsegment`
- `business`
- `style`
- `prompt`: maximo 5000 caracteres

Campos opcionais:

- `logo`: PNG/JPEG/WebP, maximo 15 MB
- `palette`: JSON array de cores
- `city`
- `state`
- `briefing`

### Saida sincrona

`post-gen-generate` retorna `202` com:

```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "request_id": "uuid"
  }
}
```

### Polling

`get-garden-job?job_id={uuid}` retorna:

- `status`
- `output_image_url`
- `duration_ms`
- `error_code`
- `error_message`
- `input_format`
- `input_metadata`
- `request_id`
- timestamps

### Paths de storage

- Logo: `aurea-garden-assets/gen/{jobId}/logo.{ext}`
- Output: `aurea-garden-assets/gen/{jobId}/output.png`

## Plano tecnico sugerido para remocao

1. Criar uma branch dedicada.
2. Remover rotas e navegacao frontend:
   - `src/App.jsx`
   - `src/pages/AiStep2Monitor/MonitorLayout.jsx`
3. Apagar paginas/hooks exclusivos:
   - `src/pages/AiStep2Monitor/PostGenPage.jsx`
   - `src/pages/AiStep2Monitor/GardenGalleryPage.jsx`
   - `src/pages/AiStep2Monitor/useGardenOptions.js`
4. Apagar Edge Functions Garden:
   - `supabase/functions/post-gen-generate/`
   - `supabase/functions/get-garden-options/`
   - `supabase/functions/get-garden-job/`
   - `supabase/functions/list-garden-jobs/`
   - `supabase/functions/_shared/garden/`
5. Atualizar documentacao ativa:
   - `AGENTS.md`
   - `supabase/README.md`
   - `src/README.md`
   - `CONTEXT-MAP.md`
   - `.context/modules/aurea-studio/`
   - `.agents/skills/aurea-garden/` e regras relacionadas
   - `.claude/skills/aurea-garden/` e regras relacionadas, se usadas
   - docs/planos ativos que citam Post Gen
6. Criar migration nova para descontinuacao de banco, depois de validar remoto:
   - Opcao conservadora: renomear/arquivar `garden_jobs` e manter Storage por retencao.
   - Opcao destrutiva: dropar `garden_jobs` e apagar bucket/objetos `aurea-garden-assets`.
7. Remover deploys remotos das Edge Functions Garden no Supabase, se a politica operacional permitir.
8. Rodar verificacoes:
   - `npm run lint`
   - `npm run build`
   - `npm run gate:prepush`
   - Deno tests das funcoes compartilhadas restantes, se houver impacto.

## Checklist de seguranca antes de dropar banco/storage

- Confirmar se a galeria Post Gen tem imagens que precisam ser preservadas.
- Confirmar se `garden_jobs` contem apenas `tool='post-gen'` ou tambem historico `post-turbo`.
- Confirmar se `aurea-garden-assets` contem apenas assets Garden.
- Confirmar se algum dashboard externo consulta `garden_jobs`.
- Confirmar se as tabelas `celebridades`, `subsegmento` e `negocio` nao sao usadas por outros sistemas.
- Confirmar que `nanobanana_config` continua necessaria para AI Campaign antes de qualquer alteracao nela.

## Comandos de busca usados neste mapeamento

```bash
rg -n -i "post[ -]?gen|postgen|aurea garden|aurea-garden|garden_jobs|garden jobs|aurea-garden-assets|get-garden|list-garden|post-gen-generate|garden gallery|garden|nanobanana.*post" . --glob '!node_modules/**' --glob '!dist/**' --glob '!coverage/**'
rg -n --hidden -i "post[ -]?gen|postgen|aurea garden|aurea-garden|garden_jobs|aurea-garden-assets|get-garden|list-garden|post-gen-generate|GardenGallery|useGardenOptions|GARDEN_NAV" . --glob '!node_modules/**' --glob '!dist/**' --glob '!coverage/**' --glob '!.git/**'
rg -n "garden_jobs|aurea-garden-assets|garden_|post-gen|nanobanana_config|nanobanana-references" supabase/migrations supabase/functions src --glob '!node_modules/**'
rg -n "_shared/garden|BUCKET_NAME|aurea-garden-assets|post-gen-generate|list-garden-jobs|get-garden-job|get-garden-options|PostGenPage|GardenGalleryPage|useGardenOptions|/ai-step2/post-gen|/ai-step2/gallery|GARDEN_NAV" . --glob '!node_modules/**' --glob '!dist/**' --glob '!coverage/**'
rg --files --hidden . | rg -i 'post[ -]?gen|postgen|garden|aurea|nanobanana'
rg -n "extractColorsFromImage|extractPalette|color-extractor" src supabase docs .context --glob '!node_modules/**'
rg -n "ASPECT_RATIOS|BENTO_SPAN|GALLERY_CATEGORY_TABS|ASSET_GROUPS|DETAIL_TABS|STATUS_META|STATUS_OPTIONS" src/pages/AiStep2Monitor src --glob '!node_modules/**'
```
