# Onboarding (Primeiro Passo)

SPA Vite + React do fluxo “Primeiro Passo” da Acelerai.

## Branding (rastreabilidade)

| Item | Valor / local |
|------|----------------|
| Logo topbar | `public/logo_acelerai_white_transp.png` — componente [`src/components/TopBarLogo.jsx`](src/components/TopBarLogo.jsx) |
| Vermelho primário (JS + CSS) | `#E8356D` — [`src/theme/design-tokens.js`](src/theme/design-tokens.js) (`colorHex.red`) e [`src/theme/global.css`](src/theme/global.css) (`--color-red`) |
| Gradientes CTA | Início `#C42A56` (`redGradientStart`), fim escuro hero `#9E2645` (`redGradientEndDark`) |

**Mudança (mar 2026):** alinhamento à marca oficial com preservação de branding durante a refatoração visual.

## Refatoração visual (mar 2026)

- Substituição de emojis por ícones Lucide (`src/components/Icon.jsx`) e remoção de setas textuais nos botões.
- Introdução de componentes reutilizáveis: `InfoCard`, `AlertBox`, `BulletList`.
- Lottie integrado em momentos de conclusão:
  - `src/components/CompletionScreen.jsx` (`success.json`)
  - `src/pages/EtapaFinal.jsx` e `src/pages/TudoPronto.jsx` (`celebration.json`)
- Tailwind v4 habilitado (`@tailwindcss/vite` + `@import "tailwindcss";` em `global.css`).
- Tokens tipográficos semânticos consolidados no arquivo único `src/theme/design-tokens.js` (export `TYPE`).

## Manutenção (tokens e branding)

- Não criar `src/theme/tokens.js`; manter fonte única em `src/theme/design-tokens.js`.
- Não reverter para `#E63333` nem tons antigos de CTA.
- Manter `TopBarLogo` como componente oficial de logo nas topbars e hero.

## UX mobile-first (mar 2026)

As melhorias definidas em `ux-mobile-spec.md` foram implementadas preservando jornada, copy e branding.

- Barra de progresso global + safe areas na `TopBar`.
- `StickyFooter` para manter ações acessíveis em telas longas.
- Swipe horizontal e restauração de scroll em etapas com slides.
- Toque e acessibilidade: aumento de hit area e atributos ARIA em componentes interativos.
- Persistência local do onboarding no `OnboardingContext` com função de reset.
- Feedback de processamento com `ProcessingOverlay` nas confirmações-chave.
- Navegação de revisão por etapas concluídas com `StepDrawer`.
- Ajustes de legibilidade/contraste (`textDim`) e tipografia responsiva via `design-tokens`.
- Persistência do multistep isolada por `compra_id` (chave por compra no localStorage), evitando reaproveitar progresso entre links diferentes.
- Comando temporário de teste: triplo clique no logo da topbar limpa o `localStorage` e reinicia a página.

Validação executada:

- `npm run build` em `apps/onboarding` concluído com sucesso.

### Comando temporário de teste (remover para prod)

- Implementação em `src/components/TopBar.jsx`.
- Flag de controle: `ENABLE_TEST_TRIPLE_TAP_RESET`.
- Comportamento: 3 cliques no logo em até `TRIPLE_TAP_WINDOW_MS` executam `localStorage.clear()` + `window.location.reload()`.
- Desligamento para produção: definir `ENABLE_TEST_TRIPLE_TAP_RESET = false` ou remover o bloco `TEMP-TEST-ONLY`.

**Evidências técnicas:** `npm run build` no diretório do app; busca sem emojis e sem setas textuais (`→`, `←`) em `src/*.jsx`.

## Ajustes de copy e regras (mar 2026)

Atualizações de conteúdo aplicadas nas etapas 2, 3 e 4, sem alteração de fluxo:

- `Etapa2`:
  - atualização de copy sobre responsabilidade de divulgação/tráfego.
  - atualização de copy sobre sessões de filmagem + briefing.
  - texto de pacote exibido como `2 vídeos (de 30 segundos) e 4 peças estáticas`.
- `Etapa3`:
  - timeline ajustada para `Preparação (Start Kit)`.
  - timeline ajustada para `Aprovação com a Celebridade`.
- `Etapa4`:
  - atualização de texto de canais digitais.
  - inclusão de dois cards de regras: marcação da celebridade e veiculação apenas em canais oficiais da marca.

Validação executada:

- `npm run build` em `apps/onboarding` concluído com sucesso.

## Etapa 6 dividida (mar 2026)

A etapa de identidade visual foi dividida em duas etapas explícitas no fluxo:

- `Etapa 6.1`: mantém o conteúdo atual de identidade visual.
- `Etapa 6.2`: nova etapa de bonificação de prazo com coleta de identidade visual em multistep.
- `Etapa 8`: modo avançado (antiga etapa 7).

### Etapa 6.2 — Multistep de identidade visual (mar 2026)

A Etapa 6.2 é um multistep interno de 5 sub-slides com `SlideDots` + `SlideTransition`:

| Slide | Conteúdo | Obrigatório |
|-------|----------|-------------|
| 0 — Logo | Upload com miniatura e "X" para remover | Sim (bloqueia avanço) |
| 1 — Cores | Cores extraídas do logo (até 3, editáveis, não removíveis) + cores custom (adicionáveis, removíveis) | Não |
| 2 — Fonte | Seleção entre Inter, JetBrains Mono, Georgia | Sim (bloqueia avanço) |
| 3 — Imagens | Upload múltiplo com grid de miniaturas e "X" individual (max 5) | Não |
| 4 — Observações | Textarea de notas livres (max 500 chars) + confirmação final | Não |

Regras de cores:
- Após upload de logo PNG/JPG/WebP, até 3 cores são extraídas automaticamente via canvas (`src/lib/color-extractor.js`).
- SVG não dispara extração (usuário adiciona manualmente).
- Cores extraídas: editáveis via color picker com popover + input hex, NÃO removíveis.
- Cores custom: adicionáveis, editáveis, removíveis. Limite total de 5 cores (extraídas + custom).

Componentes novos:
- `src/components/ThumbnailPreview.jsx` — miniatura de imagem com botão "X".
- `src/components/ColorSwatch.jsx` — cor editável com popover (color picker embarcado + input hex).
- `src/lib/color-extractor.js` — extração de cores dominantes via canvas + median-cut.

Estado salvo no contexto (`userData`):

- `identityBonusChoice`, `identityBonusLogoName`, `identityBonusExtractedColors`,
  `identityBonusCustomColors`, `identityBonusColors` (combined),
  `identityBonusFont`, `identityBonusImagesCount`, `identityBonusPending`.

Validação executada: `npm run build` com sucesso.

### Incidente de persistencia na geracao IA (mar 2026)

- Sintoma no frontend: banner `Nao foi possivel gerar o briefing com IA` com detalhe `Falha ao persistir briefing gerado no banco.`.
- Causa raiz no backend: `generate-campaign-briefing` fazia `upsert` em `onboarding_briefings` sem enviar `mode` (coluna `NOT NULL`).
- Correcao aplicada:
  - persistencia passou a sempre incluir `mode`;
  - reutiliza `mode` ja salvo por `save-campaign-briefing` para o mesmo `compra_id`;
  - fallback seguro para `briefing_input.mode` (ou `text`).
- Efeito esperado:
  - nao ocorre mais erro de constraint de `mode`;
  - erros de provider continuam retornando de forma deterministica sem quebrar persistencia de status.

## Briefing de campanha — Modo Personalizado (Etapa 8, mar 2026)

Quando o usuario seleciona `Personalizado (Avancado)` na Etapa 8 (Modo avancado), um novo bloco `Detalhes da campanha` aparece com duas abas:

- **Texto**: textarea guiado com minimo 80 / maximo 2000 caracteres, chips de topico rapido.
- **Audio**: gravacao via MediaRecorder (max. 3 min / 10 MB), player de revisao, regravar.
- **Site oficial**: campo de URL da empresa para grounding da pesquisa na geracao IA.

Regra de fluxo:
- Texto valido **ou** audio gravado habilita o CTA.
- Primeira acao no CTA em `hybrid`: gera briefing IA via Perplexity.
- Em sucesso: CTA muda para conclusao.
- Em falha: CTA permite concluir sem bloquear a jornada (fallback operacional).

### Fluxo de submissao

1. Frontend envia `POST multipart/form-data` para `save-campaign-briefing` Edge Function.
2. Audio eh salvo em Supabase Storage (bucket `onboarding-briefings`).
3. Metadados persistidos na tabela `onboarding_briefings` (upsert por `compra_id`).
4. Frontend envia `POST /functions/v1/generate-campaign-briefing` com payload canonico.
5. Edge Function gera resposta estruturada (briefing + insights + citacoes) e persiste versoes/status.
6. Transcricao assincrona permanece `pending` para audio (worker futuro).
7. Frontend nao bloqueia conclusao por falha de provider.

### Campos no userData

- `campaignBriefMode`: `'text' | 'audio' | 'both' | null`
- `campaignBriefText`: `string`
- `campaignCompanySite`: `string`
- `campaignBriefAudioDurationSec`: `number`
- `campaignBriefTranscript`: `string | null`
- `campaignBriefTranscriptStatus`: `'pending' | 'done' | 'error' | null`
- `campaignGeneratedBriefing`: `object | null`
- `campaignGeneratedInsights`: `array`
- `campaignBriefCitations`: `array`
- `campaignBriefGenerationStatus`: `'done' | 'error' | null`
- `campaignBriefErrorCode`: `string | null`

### Componentes

- `src/components/CampaignBriefing.jsx` — bloco completo com tabs, textarea, gravador, player.
- Integrado em `src/pages/Etapa7.jsx` com ciclo de geracao IA (`loading/success/error/retry`) no modo `hybrid`.
- Resumo final (`EtapaFinal.jsx`) exibe linhas de `Producao` e `Briefing` no card de resumo.

Validacao executada: `npm run build` com sucesso.

## Webhook de material (Etapa 5)

- Regra: quando o usuario marca `Sim, quero receber as 10 superdicas de trafego pago`
  na Etapa 5 e clica em avancar, o app dispara:
  - `POST` para `VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT`
  - fallback: `https://hub.aureatech.io/webhook-test/primeirospassos-envio-material`
  - payload: `{ "url": string }`
- Prioridade da URL enviada:
  1. `VITE_TRAFFIC_MATERIAL_URL` (quando configurada e valida)
  2. fallback para URL atual da pagina (`window.location.href`) para nao perder o evento
- Escolha `Agora nao` nao dispara webhook.

## Troubleshooting (Lottie)

- Erro observado: `Element type is invalid ... got: object` em `CompletionScreen`.
- Causa provável: interop ESM/CJS do `lottie-react` retornando objeto no import default em alguns cenários.
- Padrão adotado:
  - usar `import LottieImport from "lottie-react"` e resolver componente com fallback:
    - função direta (`LottieImport`)
    - ou `LottieImport.default` quando necessário
  - se `Lottie` não for componente válido, renderizar fallback estático (ícone) nas telas finais.
- Arquivos com o padrão aplicado:
  - `src/components/CompletionScreen.jsx`
  - `src/pages/EtapaFinal.jsx`
  - `src/pages/TudoPronto.jsx`
- Proteção adicional: `src/components/Icon.jsx` valida tipo renderizável do componente antes de renderizar.

**Nota:** `npm run lint` pode falhar se não houver `eslint.config.*` no app (config legada).

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Deploy (Vercel)

- Projeto oficial: `onboarding-primeiro-passo`
- URL canônica de produção: `https://onboarding-primeiro-passo.vercel.app`
- Estratégia: deploy isolado do app onboarding (não usa o `vercel.json` raiz do dashboard)

### Configuração recomendada no projeto Vercel

| Campo | Valor |
|------|-------|
| Root Directory | `apps/onboarding` |
| Framework Preset | `Vite` |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Install Command | `npm i -g corepack@latest && corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile` |

### Deploy manual (CLI)

```bash
# Preview (a partir de apps/onboarding)
vercel --scope aureas-projects-ca9dee86

# Produção
vercel --prod --scope aureas-projects-ca9dee86
```

### Validação pós-deploy

- Abrir `https://onboarding-primeiro-passo.vercel.app`.
- Validar rota SPA com `compra_id` na URL.
- Confirmar carregamento da Edge Function `get-onboarding-data`.
- Referência operacional completa: `docs/deploy-onboarding-vercel.md`.

### Troubleshooting (lockfile em CI/Vercel)

- Erro comum: `ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE`.
- Causa provável: lockfile incompatível ou desatualizado para o ambiente do build.
- Ações:
  - sincronizar lockfile local (`pnpm install`) e commitar o `pnpm-lock.yaml` atualizado;
  - garantir versões compatíveis (Node >= 20 e pnpm 10.x);
  - em análise emergencial apenas, validar build com `--no-frozen-lockfile` para confirmar diagnóstico.

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL base do projeto Supabase para leitura de `get-onboarding-data` |
| `VITE_ONBOARDING_BASE_URL` | Nao (local) | URL base usada em desenvolvimento para links do onboarding |
| `VITE_TRAFFIC_MATERIAL_URL` | Nao (recomendada) | Link do material enviado no webhook da Etapa 5 quando houver opt-in |
| `VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT` | Nao (recomendada) | Endpoint do webhook n8n para receber o POST da Etapa 5 |

## ai-step2 (Geracao de pecas por IA)

Pipeline de geracao de 12 pecas estaticas (3 grupos x 4 formatos) integrado ao onboarding.

Disparo automatico do job:

- Path `hybrid`: `save-campaign-briefing` dispara `create-ai-campaign-job` apos salvar briefing.
- Path `standard`: `save-onboarding-identity` dispara `create-ai-campaign-job` quando recebe `production_path=standard`.
- Trigger server-to-server (service role), fire-and-forget.

### Variaveis de ambiente (Edge Functions)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Sim | API key para chamadas ao modelo Gemini |
| `SUPABASE_URL` | Sim | URL do projeto Supabase (automatica em Edge Functions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role (automatica em Edge Functions) |

### Edge Functions

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `create-ai-campaign-job` | Publica (sem verify_jwt) + bearer interno | Cria/retoma job e delega geracao para workers `generate-ai-campaign-image` em background |
| `generate-ai-campaign-image` | Publica (sem verify_jwt) + bearer interno | Worker individual para gerar 1 asset, subir no storage e atualizar status no banco |
| `get-ai-campaign-status` | Publica | Polling de status e retorno de assets |
| `get-ai-campaign-monitor` | Publica | Endpoint agregador para tela operacional (job + assets + erros + onboarding identity + briefing + uploads assinados) |

### Tabelas Supabase

| Tabela | Descricao |
|--------|-----------|
| `ai_campaign_jobs` | Jobs de geracao com status e metadados |
| `ai_campaign_assets` | Assets gerados (grupo, formato, URL) |
| `ai_campaign_errors` | Erros por tentativa de geracao |

Contrato tecnico completo: `apps/onboarding/ai-step2/CONTRACT.md`

### Tela operacional de monitoramento (sem auth)

- Rota dedicada no app onboarding: `/ai-step2/monitor`.
- Modos de entrada por query string:
  - **Lista (painel de controle):** sem params ou `?mode=list`
  - **Detalhe:** `?compra_id=<uuid>` (preferencial) ou `?job_id=<uuid>`
- Filtros da lista:
  - `page`, `limit`
  - `status` (`pending|processing|completed|partial|failed`)
  - `celebrity` (filtro client-side por celebridade)
  - `q` (busca simples por ids/status)
- Objetivo: acompanhamento operacional da geracao IA com:
  - status, progresso e atualizacao periodica;
  - galeria de previews em **Bento grid** por categoria (`moderna`, `clean`, `retail`) com aspect-ratio por formato;
  - download disponivel **apenas no viewer ampliado** (sem botao inline nos cards);
  - metricas de progresso (total esperado, gerado, percentual) e barra de andamento no **topo da aba Galeria**;
  - painel de detalhes do onboarding (identidade visual, briefing e uploads).
- Navegacao:
  - lista -> clique direto na linha injeta `job_id` na URL;
  - detalhe -> botao `Voltar para lista`.
- UX da sidebar:
  - logo clicavel para home (`/ai-step2/monitor?mode=list`) limpando filtros;
  - sidebar fixa e consistente entre lista e detalhe;
  - no detalhe, navegacao por abas na area de conteudo (`Galeria`, `Dados do Onboarding`, `Erros e Diagnostico`).
- Tabela de jobs: 5 colunas (Cliente, Celebridade, Status, Progresso, Atualizado em) com largura uniforme (`repeat(5, minmax(0, 1fr))`) e truncamento por ellipsis.
- Fonte de dados principal: `get-ai-campaign-monitor` (agregador).
- Aba `Perplexity IA > Testes`: execucao manual de prompt por compra elegivel, com campos complementares e historico de runs (`test-perplexity-briefing` + tabela `perplexity_test_runs`).

### Melhoria de performance do monitor (mar 2026)

- Navegacao lateral do monitor passou de `window.location.href` para `history.pushState` + evento `aurea:location-change`, evitando full reload entre `Visao Geral`, `Perplexity IA` e `NanoBanana IA`.
- Hook `useAiCampaignMonitor` recebeu:
  - cache em memoria por chave de query (`mode/page/limit/status/q`);
  - dedupe de requests em voo (`inflightByKey`);
  - cancelamento com `AbortController` para troca rapida de filtros/rota;
  - loading progressivo (mantem dados visiveis durante revalidacao).
- Instrumentacao adicionada com `performance.mark/measure`:
  - `ai-step2-nav-start`
  - `ai-step2-list-fetch-start` / `ai-step2-list-fetch-end`
  - `ai-step2-list-render-ready`
  - metricas logadas em dev como `[ai-step2-monitor][perf] ...`.
- Benchmark manual (5 transicoes config -> lista, ambiente local quente):
  - `nav-to-render-ready` observado: `991ms`, `33ms`, `35ms`, `36ms`, `982ms`
  - mediana: `36ms`
  - p95: `991ms`
- Baseline pre-melhoria observado no diagnostico inicial: percepcao de 2-3s com exibicao de skeleton antes da tabela util.
