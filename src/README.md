# `src/` — Onboarding SPA (React 19 + Vite)

SPA do onboarding **Primeiro Passo**, servido em `https://onboarding-primeiro-passo.vercel.app`. **105 arquivos**, ~15k linhas de JSX/JS. Sem TypeScript (exceto 1 arquivo de teste).

## Estrutura

```
src/
├── App.jsx (222)              Router caseiro por state + ErrorBoundary + CopyProvider
├── main.jsx                   Bootstrap Vite
├── copy.js (620)              Fallback de copy (singleton também em Supabase)
├── pages/                     Telas principais (onboarding + painéis internos)
├── components/ (22)           UI compartilhada
├── context/ (2)               OnboardingContext, CopyContext
├── lib/ (7)                   Utilitários (cor, url, deep-merge, validação)
├── theme/                     design-tokens.js, colors.js, global.css
└── assets/lottie/             2 animações (celebration, success)
```

## Fluxo do onboarding (público, sem auth)

```
Etapa1Hero → Etapa2 → Etapa3 → Etapa4 → Etapa5 → Etapa6 | Etapa62 → EtapaFinal → TudoPronto
```

- **Etapa3** é a mais pesada (1156 linhas) — candidata a refactor.
- **Etapa62** (738 linhas) substitui a antiga `Etapa7` (removida durante o plano de enrichment).
- Estado global via `context/OnboardingContext.jsx` (376 linhas).
- Segurança depende de UUID não-adivinhável; todas as Edge Functions de onboarding são públicas (`--no-verify-jwt`).

## Páginas internas (não-onboarding)

Dois mini-apps embutidos no mesmo bundle:

### 1. `pages/AiStep2Monitor/` (15 arquivos)
Painel de monitoramento do AI Campaign Pipeline:

- `index.jsx`, `MonitorLayout.jsx`
- `ListModePanel.jsx`, `DetailModePanel.jsx`
- Sub-páginas: `GardenGalleryPage`, `PostGenPage`, `NanoBananaConfigPage`, `PerplexityConfigPage`
- Hooks: `useAiCampaignMonitor`, `useGardenOptions`
- Componentes locais: `StatusBadge`, `TabBar`, `DataRow`, `ImageViewer`, `ProgressBar`, `FieldInfoModal`

### 2. `pages/CopyEditor/` (24 arquivos)
CMS interno da tabela singleton `onboarding_copy`:

- `index.jsx`, `CopyEditorLayout.jsx`, `PreviewEditorLayout.jsx`
- `EtapaSidebar`, `EtapaSection`, `FieldEditor`, `EditableText`, `EditableList`, `EditableObjectList`
- `PreviewPanel`, `DiffPanel`, `PublishDialog`, `SearchOverlay`, `EditorToolbar`
- 15 blocos `Pv*` (`PvStepHeader`, `PvQuizBlock`, `PvInfoCard`, `PvCtaButton`, `PvTimeline`, etc.) — espelham os componentes do onboarding para preview ao vivo.

## `components/` — UI compartilhada (22)

`NavButtons`, `StepHeader`, `StepDrawer`, `SlideDots`, `SlideTransition`, `PageTransition`, `PageLayout`, `TopBar`, `TopBarLogo`, `StickyFooter`, `InfoCard`, `BulletList`, `AlertBox`, `ColorSwatch`, `Icon`, `QuizConfirmation`, `CampaignBriefing`, `CompletionScreen`, `ProcessingOverlay`.

## `lib/` — Utilitários

| Arquivo | Função |
|---|---|
| `color-extractor.js` | Extrai paleta do logo no client |
| `logo-bg-remover.js` | Remove fundo do logo |
| `file-to-canvas.js` | Converte upload para canvas |
| `ai-step2-validation.js` + `.test.ts` | Valida payload do AI Step 2 (único arquivo TS) |
| `url-utils.js` | Parsing de query/params |
| `deep-merge.js` | Merge profundo para copy |

## `theme/`

- `design-tokens.js` — tokens canônicos (cores, espaçamento, tipografia)
- `colors.js` — paleta derivada
- `global.css` — reset + variáveis CSS
- Brand: primary `#384ffe` (Acelerai Blue), destructive `#ff0058`. Font: Inter (Google Fonts CDN).

## Observações arquiteturais

- **Roteamento manual**: `App.jsx` alterna views por state + parsing de URL, sem `react-router`. Simples, mas custa ~200 linhas de boilerplate.
- **Arquivos enormes**: `Etapa3.jsx` (1156) e `Etapa62.jsx` (738) violam qualquer limite razoável — bons alvos de refactor quando aparecer bug nelas.
- **Sem auth no onboarding**: consistente com o `CLAUDE.md`. As páginas `AiStep2Monitor` e `CopyEditor` compartilham bundle mas dependem do plano de auth ativo (`plan/2026-04-19-fase1-fundacao-auth-frontend-dashboard.md`) para virarem restritas.
- **`copy.js` como fallback**: 620 linhas de copy hardcoded, espelhando a tabela singleton `onboarding_copy`. Vive junto ao `CopyContext.jsx` e é sobrescrito pelo conteúdo do Supabase quando disponível.
- **Error boundary global** em `App.jsx` captura crashes silenciosos e renderiza tela de erro com botão "Recarregar".

## Comandos

```bash
npm run dev       # Vite dev server (porta 5173)
npm run build     # Build de produção
npm run lint      # ESLint
npm run preview   # Preview do build
```
