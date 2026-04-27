# Auditoria de Design do Dashboard

Data: 2026-04-27

## Escopo

Este mapeamento cobre as telas internas renderizadas pelo roteamento manual de `src/App.jsx`, mais as telas de autenticacao usadas para entrada no dashboard.

## Fonte do Design Atual

- Tokens globais: `src/theme/design-tokens.js` e `src/theme/global.css`
- Tema paralelo do dashboard AI: `src/pages/AiStep2Monitor/theme.js`
- Layout compartilhado do dashboard: `src/pages/AiStep2Monitor/MonitorLayout.jsx`
- Diretriz externa usada como checklist: Vercel Web Interface Guidelines

O app principal de onboarding usa uma identidade dark com fundo `#0A0A0A`, card `#141414`, accent lima `#C8FF00`, magenta `#FF00FF` e vermelho `#E8356D`. O dashboard criou uma variante propria, mais "console", com `#080C14`, `#0D1117`, `#161B22`, texto `#E6EDF3` e botoes claros. Essa variante e consistente em parte, mas ainda nao esta formalizada como spec de dashboard.

## Mapa de Telas

### Shell Compartilhado

Arquivo: `src/pages/AiStep2Monitor/MonitorLayout.jsx`

- Sidebar fixa de 280px
- Logo como atalho para `/ai-step2/monitor?mode=list`
- Navegacao principal:
  - Visao Geral
  - Perplexity IA
  - NanoBanana IA
  - Copy Editor
- Navegacao de acesso:
  - Usuarios
- Conta:
  - Meu Perfil
- Rodape:
  - email do usuario
  - logout
- Conteudo central com max-width 1280

### Autenticacao

Arquivos:

- `src/pages/Login.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`

Rotas:

- `/login`
- `/forgot-password`
- `/reset-password`
- `/reset-password?type=invite`

Estados mapeados:

- login normal
- erro de env/auth
- recuperacao solicitada
- link invalido
- redefinicao pronta
- senha redefinida
- convite aceito via reset-password

### AI Step 2 Monitor

Arquivos:

- `src/pages/AiStep2Monitor/index.jsx`
- `src/pages/AiStep2Monitor/ListModePanel.jsx`
- `src/pages/AiStep2Monitor/DetailModePanel.jsx`
- `src/pages/AiStep2Monitor/components/ImageViewer.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/OnboardingDataTab.jsx`

Rotas/estados:

- `/ai-step2/monitor?mode=list`
- `/ai-step2/monitor?job_id=...`
- loading skeleton
- erro geral
- sucesso/erro de acao

Tela de lista:

- cabecalho "Geracao de imagens IA"
- cards de resumo: Total, Processando, Concluidos, Falhas/Parcial
- filtro por venda/nome com dropdown
- busca direta por `compra_id`
- filtro de status
- filtro de celebridade
- abrir formulario
- liberar onboarding manualmente
- tabela/lista de jobs
- paginacao

Tela de detalhe:

- tabs:
  - Galeria
  - Dados do Onboarding
  - Erros e Diagnostico
- subtabs de galeria:
  - Moderna
  - Clean
  - Retail
- cards de asset
- reprocessamento por asset, categoria e falhas
- modal `ImageViewer` com zoom, download, anterior/proxima e fechar

Dados do Onboarding:

- Marca
- Contrato
- Identidade Visual
- Presenca Digital
- Briefing
- Logo
- Imagens da campanha
- Audio do briefing
- banner para regenerar assets apos mudancas

### Configuracao Perplexity

Arquivo: `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`

Rota: `/ai-step2/perplexity-config`

Tabs:

- Provider & Parametros
- Prompts
- Testes
- Versionamento

Fluxos:

- configurar modelo, timeout, API base URL e API key
- editar parametros de geracao
- editar system/user prompt templates
- selecionar compra elegivel
- descobrir fontes da empresa
- sugerir briefing seed
- executar teste Perplexity
- historico de testes
- versionamento de prompt/template

### Configuracao NanoBanana

Arquivo: `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`

Rota: `/ai-step2/nanobanana-config`

Tabs:

- Provider
- Global Rules
- Direcao Criativa
- Formatos & Versao

Fluxos:

- configurar Gemini
- editar regras globais
- editar direcoes `moderna`, `clean`, `retail`
- upload/remocao/leitura de imagem de referencia
- editar instrucoes por formato
- versionamento de prompt

### Copy Editor

Arquivos:

- `src/pages/CopyEditor/index.jsx`
- `src/pages/CopyEditor/PreviewEditorLayout.jsx`
- `src/pages/CopyEditor/EditorToolbar.jsx`
- `src/pages/CopyEditor/EtapaSidebar.jsx`
- `src/pages/CopyEditor/SearchOverlay.jsx`
- `src/pages/CopyEditor/PublishDialog.jsx`
- previews em `src/pages/CopyEditor/previews/*`

Rota: `/copy-editor`

Etapas:

- Etapa 1 - Boas-vindas
- Etapa 2 - Como funciona
- Etapa 3 - Prazos e combinados
- Etapa 4 - Regras da celebridade
- Etapa 5 - Presenca digital
- Etapa 6 - Identidade visual
- Etapa 6.2 - Bonificacao
- Etapa Final - Parabens

Fluxos:

- preview visual do onboarding
- edicao inline de textos
- chips de variaveis
- busca global
- comparacao/diff
- reset de etapa
- exportar/importar JSON
- publicar no Supabase

### Usuarios

Arquivos:

- `src/pages/Users/UsersList.jsx`
- `src/pages/Users/InviteUserModal.jsx`
- `src/pages/Users/EditUserModal.jsx`

Rota: `/users`

Fluxos:

- listar usuarios
- filtrar por busca, role e status
- convidar usuario
- editar role/status
- desativar/reativar
- excluir usuario com confirmacao por email

### Perfil

Arquivo: `src/pages/Profile.jsx`

Rota: `/profile`

Fluxos:

- editar nome
- visualizar email
- visualizar role
- salvar perfil

## Desvios do Design Spec

### 1. Spec visual do dashboard nao esta formalizada

O tema do dashboard vive em `monitorTheme`, mas os tokens oficiais do app continuam em `designTokens`. Isso cria duas identidades: onboarding dark/lima/magenta/vermelho e dashboard console/azul/vermelho. O problema nao e existir uma variante, e sim ela nao estar documentada como contrato.

Arquivos principais:

- `src/theme/design-tokens.js`
- `src/pages/AiStep2Monitor/theme.js`

Recomendacao:

- criar tokens formais `dashboardTheme` ou promover `monitorTheme` para `src/theme/dashboard-tokens.js`
- documentar quando usar tokens globais vs tokens de dashboard
- remover cores hardcoded de componentes

### 2. Azul primario hardcoded foge da paleta oficial

O dashboard usa `#384ffe` como cor de acao primaria em Usuarios, Perfil, Auth e editores de onboarding. Essa cor nao existe nos tokens globais nem no `monitorTheme`.

Ocorrencias:

- `src/pages/Login.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/Users/UsersList.jsx`
- `src/pages/Users/InviteUserModal.jsx`
- `src/pages/Users/EditUserModal.jsx`
- `src/pages/Profile.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/*`

Recomendacao:

- se azul for a cor primaria do dashboard, adiciona-la como token oficial: `dashboardActionPrimary`
- se nao for, trocar por `monitorTheme.brand`/`colorHex.red` ou por botao claro ja usado em `monitorTheme.buttonDarkBg`

### 3. Vermelho/destrutivo paralelo com `#ff0058`

Alguns componentes usam `#ff0058`, enquanto os tokens oficiais tem `danger: #FF4444` e `red: #E8356D`.

Ocorrencias:

- `src/pages/AiStep2Monitor/components/onboarding-edit/EditableField.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/PaletteEditor.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/LogoManager.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/OnboardingDataTab.jsx`

Recomendacao:

- consolidar semantica: `danger`, `brand`, `warning`, `success`
- evitar misturar cor de marca com cor destrutiva

### 4. Warning hardcoded no fluxo de liberacao

`ListModePanel` usa `#f59e0b` para "Liberar Onboarding". Esse warning nao vem de `monitorTheme.warningText` nem dos tokens globais.

Arquivo:

- `src/pages/AiStep2Monitor/ListModePanel.jsx`

Recomendacao:

- criar tokens `warningBg`, `warningText`, `warningBorder` no dashboard
- padronizar o CTA de excecao manual

### 5. Estados de foco estao removidos em varios inputs

Ha muitos `outline: 'none'` sem substituto `:focus-visible`. Isso foge da spec de acessibilidade e deixa a navegacao por teclado fraca.

Arquivos principais:

- `src/pages/Login.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
- `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
- `src/pages/AiStep2Monitor/components/TabBar.jsx`
- `src/pages/AiStep2Monitor/components/DataRow.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/EditableField.jsx`
- `src/pages/CopyEditor/SearchOverlay.jsx`
- `src/pages/CopyEditor/PublishDialog.jsx`
- `src/pages/CopyEditor/EditableText.jsx`
- `src/pages/CopyEditor/FieldEditor.jsx`

Recomendacao:

- criar helper/shared style de `focusVisibleRing`
- para inline styles, migrar componentes criticos para classes CSS ou handlers `onFocus/onBlur` com ring visivel

### 6. Icon-only buttons sem `aria-label`

O `ImageViewer` tem botoes so com icones para zoom, download, fechar e navegar sem `aria-label`.

Arquivo:

- `src/pages/AiStep2Monitor/components/ImageViewer.jsx`

Recomendacao:

- adicionar labels: "Diminuir zoom", "Aumentar zoom", "Baixar imagem", "Fechar visualizador", "Imagem anterior", "Proxima imagem"

### 7. Modal/dialog sem foco gerenciado

Os modais usam `role="dialog"` e `aria-modal`, mas nao fazem foco inicial, retorno de foco, trap de foco nem fechamento por Escape de forma consistente.

Arquivos:

- `src/pages/AiStep2Monitor/components/ImageViewer.jsx`
- `src/pages/AiStep2Monitor/components/FieldInfoModal.jsx`
- `src/pages/CopyEditor/SearchOverlay.jsx`
- `src/pages/CopyEditor/PublishDialog.jsx`
- `src/pages/Users/InviteUserModal.jsx`
- `src/pages/Users/EditUserModal.jsx`

Recomendacao:

- criar componente `DashboardModal`
- padronizar overlay, `aria-labelledby`, Escape, foco inicial e `overscroll-behavior: contain`

### 8. Layout nao responsivo no shell principal

`MonitorLayout` usa grid fixo `280px minmax(0,1fr)` sem breakpoint. A lista de jobs usa 7 colunas fixas. Isso tende a quebrar em tablet/mobile ou em janelas estreitas.

Arquivos:

- `src/pages/AiStep2Monitor/MonitorLayout.jsx`
- `src/pages/AiStep2Monitor/ListModePanel.jsx`
- `src/pages/Users/UsersList.jsx`

Recomendacao:

- adicionar breakpoint para sidebar virar topo/drawer
- transformar tabela de jobs em tabela com overflow controlado ou cards responsivos
- definir largura minima e `overflow-x: auto` intencional quando tabela for inevitavel

### 9. Copy Editor mistura preview dark do onboarding com shell console sem uma regra clara

O editor carrega o shell do monitor, mas a area de preview usa `COLORS.bg` do onboarding e largura 520px. Isso e correto para simular o onboarding, mas precisa estar visualmente rotulado como "preview do cliente" para nao parecer uma terceira superficie de dashboard.

Arquivo:

- `src/pages/CopyEditor/PreviewEditorLayout.jsx`

Recomendacao:

- manter o preview com tokens do onboarding
- padronizar a moldura/superficie externa com dashboard tokens
- diferenciar visualmente "ferramenta" vs "preview renderizado"

### 10. Textos ainda usam grafia sem acentos e reticencias ASCII

Muitos textos aparecem como `Configuracoes`, `Geracao`, `Ultima atualizacao`, `Carregando...`, `Salvando...`. A spec de UI recomenda copy final em pt-BR e reticencias `…`.

Arquivos recorrentes:

- `src/App.jsx`
- `src/pages/AiStep2Monitor/*`
- `src/pages/Login.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/Users/*`
- `src/pages/Profile.jsx`

Recomendacao:

- padronizar copy de dashboard em pt-BR com acentos
- trocar `...` por `…` em estados de loading/saving

### 11. Imagens sem dimensoes explicitas

Cards de asset, previews de referencia e logos usam `img` com CSS, mas sem `width`/`height` HTML. Em SPA isso ainda pode causar layout shift em listas.

Arquivos:

- `src/pages/AiStep2Monitor/DetailModePanel.jsx`
- `src/pages/AiStep2Monitor/components/ImageViewer.jsx`
- `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/LogoManager.jsx`
- `src/pages/AiStep2Monitor/components/onboarding-edit/OnboardingDataTab.jsx`

Recomendacao:

- adicionar `width`/`height` quando o ratio for conhecido
- usar wrappers com `aspect-ratio` ja existentes como fonte de estabilidade
- lazy-load thumbnails abaixo da dobra

### 12. Feedback assíncrono inconsistente

Alguns fluxos usam banners inline, outros `window.alert`, outros mensagens sem `aria-live`.

Arquivos:

- `src/pages/CopyEditor/EditorToolbar.jsx`
- `src/pages/AiStep2Monitor/index.jsx`
- `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
- `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
- `src/pages/Profile.jsx`

Recomendacao:

- criar `DashboardToast`/`InlineNotice`
- usar `role="status"` ou `aria-live="polite"` para sucesso
- manter `role="alert"` para erro
- remover `window.alert`

### 13. Navegacao/state nao esta totalmente refletida na URL

O monitor lista/detalhe usa query params, mas tabs internas como Galeria/Dados/Erros, categorias da galeria e tabs de configuracao vivem so em `useState`.

Arquivos:

- `src/pages/AiStep2Monitor/index.jsx`
- `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
- `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
- `src/pages/CopyEditor/index.jsx`

Recomendacao:

- sincronizar `tab`, `category` e `etapa` com query params
- permitir deep-link de uma aba especifica

## Prioridade Recomendada

1. Formalizar `dashboardTheme` e remover hardcodes (`#384ffe`, `#ff0058`, `#f59e0b`, `#A7F3D0`).
2. Criar componentes base: `DashboardButton`, `DashboardField`, `DashboardModal`, `InlineNotice`, `DashboardTabs`.
3. Corrigir foco visivel e `aria-label` dos controles icon-only.
4. Resolver responsividade do shell e tabelas.
5. Sincronizar tabs principais com URL.
6. Revisar copy final em pt-BR com acentos e reticencias corretas.

## Observacao

Nao executei validacao visual em navegador autenticado porque as rotas de dashboard dependem de sessao Supabase. A analise acima foi feita por roteamento, componentes e tokens de design no codigo.
