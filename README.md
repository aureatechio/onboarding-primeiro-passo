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

**Evidências técnicas:** `npm run build` no diretório do app; busca sem emojis e sem setas textuais (`→`, `←`) em `src/*.jsx`.

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
