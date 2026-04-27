---
name: dashboard-design
description: "Especialista em frontend, UI/UX, design system, layout e acessibilidade do dashboard interno deste projeto. Use sempre que o pedido envolver telas internas, dashboard, painel, monitor AI Step 2, Copy Editor, Usuarios, Perfil, login/auth screens, componentes em src/components/dashboard, MonitorLayout, tokens visuais, responsividade, layout, polimento visual, revisao de UI, UX, acessibilidade ou qualquer alteracao que afete aparencia/interacao do dashboard."
---

# Dashboard Design Specialist — Frontend, UI/UX e Layout

## Objetivo

Atuar como especialista do frontend operacional do dashboard interno do `primeiro-passo-app`, preservando a identidade visual oficial definida para as telas internas:

- Dark-first.
- Operacional, denso e escaneavel.
- Acento Acelerai `#E8356D` usado com parcimonia.
- Componentes previsiveis para trabalho recorrente.
- Acessibilidade e responsividade como parte do acabamento, nao como etapa opcional.

Use esta skill antes de diagnosticar, criar, refatorar ou revisar qualquer UI do dashboard.

## Quando acionar

Acione esta skill quando o pedido mencionar ou tocar:

- Frontend, UI, UX, design, layout, responsividade, acessibilidade, visual polish ou design system do dashboard.
- Rotas internas: `/ai-step2/*`, `/copy-editor`, `/users`, `/profile`, `/login`, `/forgot-password`, `/reset-password`.
- Arquivos em `src/pages/AiStep2Monitor/`, `src/pages/CopyEditor/`, `src/pages/Users/`, `src/pages/Profile.jsx`, `src/pages/Login.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx`.
- Componentes compartilhados em `src/components/dashboard/`.
- Tokens em `src/theme/dashboard-tokens.js`, `src/theme/design-tokens.js`, `src/theme/global.css` ou `src/pages/AiStep2Monitor/theme.js`.
- Sidebar, navegacao, cards, tabelas, formularios, modais, tabs, badges, toasts/notices, estados vazios, loading states, image viewer ou previews.

Se a tarefa tambem envolver auth/RBAC, use junto com a skill `authentication` ou `user-management`.
Se a tarefa tambem alterar campos/fluxo do onboarding publico, use junto com a skill `onboarding`.
Se a tarefa envolver Supabase/Edge Functions, use junto com a skill `supabase`.

## Leitura obrigatoria

Antes de propor ou alterar qualquer UI do dashboard, leia nesta ordem:

1. `docs/design-spec.md`
2. `src/theme/dashboard-tokens.js`
3. `src/theme/design-tokens.js`
4. `src/pages/AiStep2Monitor/MonitorLayout.jsx`
5. `src/components/dashboard/index.js`

Quando a tarefa for auditoria, refatoracao visual ampla ou priorizacao de debitos, leia tambem:

1. `docs/dashboard-design-audit-2026-04-27.md`
2. `src/README.md`

Quando a tarefa envolver uma tela especifica, leia o arquivo da tela e seus componentes locais antes de editar.

## Mapa atual do dashboard

| Area | Rotas | Arquivos principais |
| --- | --- | --- |
| Shell compartilhado | Todas as internas | `src/pages/AiStep2Monitor/MonitorLayout.jsx` |
| Monitor AI Step 2 | `/ai-step2/monitor`, `/ai-step2/monitor/jobs/:jobId` | `src/pages/AiStep2Monitor/index.jsx`, `ListModePanel.jsx`, `DetailModePanel.jsx` |
| Config Perplexity | `/ai-step2/perplexity-config` | `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx` |
| Config NanoBanana | `/ai-step2/nanobanana-config` | `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx` |
| Copy Editor | `/copy-editor` | `src/pages/CopyEditor/index.jsx`, `PreviewEditorLayout.jsx`, `EditorToolbar.jsx` |
| Usuarios | `/users` | `src/pages/Users/UsersList.jsx`, `InviteUserModal.jsx`, `EditUserModal.jsx` |
| Perfil | `/profile` | `src/pages/Profile.jsx` |
| Auth screens | `/login`, `/forgot-password`, `/reset-password` | `src/pages/Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` |

## Contrato visual vigente

Fonte canonica: `docs/design-spec.md`.

### Direcao

- O dashboard deve parecer um cockpit operacional da Acelerai.
- Evite hero sections, composicoes publicitarias e cards decorativos.
- Prefira informacao escaneavel, controles claros e densidade moderada.
- Use Inter como fonte principal e JetBrains Mono para labels/metadados compactos quando ja for padrao local.

### Tokens

Use `dashboardTheme`/`monitorTheme` para telas internas:

- `layoutBg`: fundo externo.
- `sidebarBg`: sidebar.
- `pageBg`: area de conteudo.
- `surface`, `surfaceSubtle`, `surfaceElevated`: superficies.
- `textPrimary`, `textSecondary`, `textMuted`: hierarquia textual.
- `border`, `borderSoft`, `borderStrong`: separacao.
- `brand`: acento Acelerai.
- `controlBg`, `controlBorder`, `controlText`: formularios.
- `danger*`, `warning*`, `success*`, `info*`: estados semanticos.

Use `designTokens` para escala compartilhada de spacing, radius, motion e tipos (`TYPE`).

### Componentes base

Antes de criar estilo inline novo, verifique se ja existe componente em `src/components/dashboard/`:

- `DashboardButton`
- `DashboardField`
- `DashboardModal`
- `DashboardTabs`
- `InlineNotice`

Crie novos componentes base somente quando houver repeticao real ou necessidade de padronizar comportamento comum.

## Regras praticas

### Sempre

- Use `monitorTheme`/`dashboardTheme` em telas internas; nao introduza nova paleta sem motivo explicito.
- Use `DashboardButton`, `DashboardField`, `DashboardModal`, `DashboardTabs` e `InlineNotice` quando couber.
- Use icones de `lucide-react` para botoes, navegacao, estados e acoes reconheciveis.
- Garanta foco visivel em controles interativos.
- Adicione `aria-label` em botoes icon-only.
- Preserve navegacao por teclado em tabs, modais e menus.
- Prefira estados semanticos: sucesso, erro, warning, info.
- Use `role="alert"` para erros e `role="status"`/`aria-live="polite"` para sucesso/progresso.
- Mantenha o dashboard funcional em janelas estreitas: overflow horizontal intencional para tabelas ou layout responsivo.
- Sincronize tabs/filtros importantes com URL quando isso melhorar deep-link, refresh e suporte operacional.
- Use copy final em pt-BR com acentos quando estiver ajustando texto visivel.

### Nunca

- Nao use `#384ffe` como primario visual novo.
- Nao use a paleta lima/magenta do onboarding como base de tela interna.
- Nao use emoji como iconografia de interface.
- Nao crie card dentro de card sem necessidade funcional clara.
- Nao remova outline/foco sem substituto acessivel.
- Nao dependa apenas de cor para estado ativo, erro ou selecao.
- Nao crie hero ou landing page para ferramenta interna.
- Nao misture preview do onboarding com UI do dashboard sem diferenciar claramente "ferramenta" vs "preview do cliente".

## Workflow de implementacao

1. Classifique a tela/fluxo afetado.
2. Leia a documentacao obrigatoria e os arquivos-alvo.
3. Identifique se a mudanca pertence ao shell, componente base, tela especifica ou preview do onboarding.
4. Reaproveite tokens e componentes existentes.
5. Reduza hardcodes de cor, spacing e radius quando tocar a area.
6. Verifique estados: loading, vazio, erro, sucesso, disabled, hover, focus, mobile/estreito.
7. Se alterar padrao compartilhado, revise os consumidores principais.
8. Se mudar contrato visual, atualize `docs/design-spec.md` ou registre a razao.

## Workflow de revisao UI/UX

Ao revisar dashboard, organize achados por prioridade:

1. Acessibilidade: foco, labels, contraste, teclado, `aria-*`.
2. Responsividade/layout: overflow inesperado, sobreposicao, truncamento de informacao critica.
3. Consistencia: tokens, componentes base, radius, spacing, iconografia.
4. Hierarquia e fluxo: titulo, CTA principal, densidade, agrupamento.
5. Feedback: loading, erro, sucesso, operacoes async.
6. Copy visivel: pt-BR, clareza operacional, acentos.

Quando encontrar problema, cite arquivo e linha quando possivel.

## Pontos de atencao conhecidos

O audit de 2026-04-27 registrou estes temas recorrentes:

- Hardcodes visuais herdados em telas antigas.
- Foco visivel inconsistente em alguns componentes.
- Modais antigos sem foco/trap padronizado.
- Botoes icon-only sem `aria-label` em alguns fluxos.
- Responsividade do shell/tabelas como area sensivel.
- Copy Editor precisa distinguir bem shell do dashboard e preview do onboarding.
- Feedback async ainda mistura banners, mensagens locais e alertas.

Use esses pontos como checklist, mas confirme o estado atual no codigo antes de alterar.

## Verificacao

Para mudancas de frontend:

```bash
npm run lint
npm run build
```

Para ajustes visuais relevantes, tambem rode o app local e valide em navegador quando viavel:

```bash
npm run dev
```

Verifique pelo menos:

- Desktop largo.
- Janela estreita/tablet.
- Fluxo de teclado nos controles alterados.
- Estados de loading/erro/sucesso quando existirem.

## Saida esperada

Ao concluir uma tarefa desta area, reporte:

1. O que mudou visualmente ou estruturalmente.
2. Quais arquivos foram alterados.
3. Que tokens/componentes base foram usados ou criados.
4. Como acessibilidade e responsividade foram tratadas.
5. Quais verificacoes foram executadas.
