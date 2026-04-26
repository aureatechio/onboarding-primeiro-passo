# Primeiro Passo — Onboarding Acelerai

> Experiência guiada de entrada do cliente após a contratação de campanha com celebridade.

O **Primeiro Passo** transforma o momento de "assinou, e agora?" em uma jornada clara, curta e orientada à ação — reduzindo ruídos, alinhando expectativas e acelerando a ativação da campanha.

---

## Stack de Tecnologia

| Tecnologia | Versão | Função |
|---|---|---|
| React | ^19.2.4 | UI framework principal |
| Vite | ^8.0.1 | Build tool e dev server |
| Tailwind CSS | ^4.2.2 | Estilização utility-first |
| Framer Motion | ^12.38.0 | Animações e transições de página |
| Lottie React | ^2.4.1 | Animações Lottie |
| Lucide React | ^1.0.1 | Ícones |
| clsx | ^2.1.1 | Utilitário de className condicional |

**Deploy:** Vercel (`onboarding-primeiro-passo`)  
**Backend:** Supabase (PostgreSQL + Auth)  
**Node:** >= 20

---

## Arquitetura

O app é uma **SPA (Single Page Application)** construída em React + Vite, sem roteamento externo. O fluxo de onboarding é sequencial e controlado por estado de contexto global.

```
SPA (React + Vite)
│
├── Context global  →  estado da jornada (etapa atual, respostas, progresso)
├── Pages/          →  uma página por etapa do onboarding (Etapa1–EtapaFinal)
├── Components/     →  blocos reutilizáveis de UI (NavButtons, StepHeader, etc.)
└── Supabase        →  persistência de respostas e handoff operacional
```

A navegação entre etapas é controlada internamente, sem URL routing — o `vercel.json` redireciona tudo para `index.html`.

---

## Como Começar

### Pré-requisitos

- Node.js >= 20
- npm >= 10

### Instalação

```bash
# Clone o repositório
git clone <url-do-repo>
cd onboarding-primeiro-passo

# Instale as dependências
npm ci
```

### Configuração de Ambiente

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_ONBOARDING_BASE_URL` | URL canônica do app em produção |
| `VITE_TRAFFIC_MATERIAL_URL` | URL do material de tráfego (Etapa 5) |
| `VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT` | Webhook para envio do material de tráfego |

### Rodando Localmente

```bash
npm run dev
# App disponível em http://localhost:5173
```

---

## Estrutura do Projeto

```
onboarding-primeiro-passo/
├── src/
│   ├── pages/              # Uma página por etapa do onboarding
│   │   ├── Etapa1Hero.jsx  # Boas-vindas
│   │   ├── Etapa2.jsx      # Como funciona a campanha
│   │   ├── Etapa3.jsx      # Prazos e combinados
│   │   ├── Etapa4.jsx      # Regras de uso da celebridade
│   │   ├── Etapa5.jsx      # Presença digital e tráfego
│   │   ├── Etapa6.jsx      # Identidade visual
│   │   ├── Etapa62.jsx     # Bonificação de prazo
│   │   ├── Etapa7.jsx      # Modo avançado de produção
│   │   ├── EtapaFinal.jsx  # Resumo e próximo passo
│   │   └── TudoPronto.jsx  # Tela de conclusão
│   ├── components/         # Componentes reutilizáveis de UI
│   ├── context/            # Context API — estado global da jornada
│   ├── lib/                # Utilitários e cliente Supabase
│   ├── assets/             # Imagens e animações Lottie
│   ├── theme/              # Tokens de design (cores, tipografia)
│   └── App.jsx             # Componente raiz
├── public/                 # Arquivos estáticos
├── supabase/               # Migrations e configuração local
├── plan/                   # Planos de feature (YYYY-MM-DD-slug.md)
├── tasks/                  # Tarefas operacionais
├── .context/               # Documentação de módulos para agentes de IA
├── .env.example            # Variáveis de ambiente necessárias
├── vite.config.js
└── vercel.json             # Rewrite rule para SPA
```

---

## Funcionalidades Principais

### Jornada de Onboarding (8 etapas)

| Etapa | Conteúdo | Ação do cliente |
|---|---|---|
| **1 — Boas-vindas** | Contextualiza e prepara para a jornada | — |
| **2 — Como funciona** | Alinha responsabilidades Acelerai × cliente | Confirma entendimento |
| **3 — Prazos** | Explica linha do tempo e impacto da agilidade | Reconhece início da janela de 15 dias |
| **4 — Regras da celebridade** | Uso de imagem, canais, limites de ajuste | Validação formal |
| **5 — Presença digital** | Importância de tráfego; material educativo | Escolhe receber ou não o material |
| **6.1 — Identidade visual** | Prepara envio de logo, cores, fontes | Envia insumos |
| **6.2 — Bonificação de prazo** | Antecipa insumos → bônus operacional | Decide antecipar ou adiar |
| **7/8 — Modo de produção** | Padrão vs. avançado | Escolhe modelo de produção |
| **Final** | Resumo consolidado + próximo contato | — |

### Animações e UX

- Transições de página com **Framer Motion**
- Animações Lottie em momentos-chave
- Design mobile-first alinhado ao dashboard operacional Acelerai
- Design spec oficial em [`docs/design-spec.md`](./docs/design-spec.md), com magenta/vermelho Acelerai `#E8356D` como acento principal

---

## Workflow de Desenvolvimento

### Comandos disponíveis

```bash
npm run dev       # Dev server (porta 5173)
npm run build     # Build de produção
npm run preview   # Preview do build
npm run lint      # Lint com ESLint
npm run gate:prepush # Gate de segurança pré-push
```

### Fluxo de branches

Utilize **Conventional Commits** nos commits:

```
feat(onboarding): adiciona etapa de bonificação de prazo
fix(etapa4): corrige validação de confirmação de regras
refactor(context): simplifica estado global da jornada
```

### Antes de abrir PR

```bash
npm run gate:prepush
```

---

## Padrões de Código

- **ESLint** + **Prettier**: sem ponto e vírgula, aspas simples, 2 espaços, trailing comma ES5, `printWidth 100`
- **Componentes**: funcionais com hooks
- **Estado global**: Context API (sem Redux)
- **Estilo**: Tailwind CSS utility classes — evitar CSS customizado
- **Animações**: Framer Motion para transições de rota; Lottie para ilustrações animadas
- Variáveis não utilizadas prefixadas com `_`

---

## Deploy (Vercel)

O projeto usa um **projeto Vercel dedicado**: `onboarding-primeiro-passo`.

| Configuração | Valor |
|---|---|
| Root Directory | `.` (raiz do repo) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| URL canônica | `https://onboarding-primeiro-passo.vercel.app` |

**Variáveis de ambiente obrigatórias no Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_ONBOARDING_BASE_URL`

**Deploy gate obrigatório (npm-only):**
- Package manager oficial: `npm`
- Lockfile oficial: `package-lock.json`
- Antes de push/deploy: `npm run gate:prepush`

> Se houver erro de lockfile no deploy, remova lockfiles não suportados e revalide com `npm ci`.

---

## Documentação Relacionada

| Arquivo | Conteúdo |
|---|---|
| [`RESUMO-EXECUTIVO-PRIMEIRO-PASSO.md`](./RESUMO-EXECUTIVO-PRIMEIRO-PASSO.md) | Visão de produto completa, regras de negócio e indicadores |
| [`onboarding.md`](./onboarding.md) | Prompt padrão para geração de briefing via API Sonar (Perplexity) |
| [`docs/design-spec.md`](./docs/design-spec.md) | Design spec oficial: tokens, cores, padrões de componentes e regras visuais |
| [`refactor-spec.md`](./refactor-spec.md) | Spec histórica de refatoração visual; usar apenas como referência secundária |
| [`ux-mobile-spec.md`](./ux-mobile-spec.md) | Spec histórica de UX mobile; usar apenas como referência secundária |
| [`plan/`](./plan/) | Planos de feature ativos |
| [`tasks/`](./tasks/) | Tarefas operacionais (bugs, pedidos, correções) |

---

## Licença

Projeto privado — © Acelerai. Todos os direitos reservados.
