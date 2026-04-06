# Relatório de Análise de Skills para o Projeto Primeiro Passo

**Projeto:** Onboarding "Primeiro Passo" — React 19 + Vite + Supabase + Tailwind CSS
**Data:** 06/04/2026

---

## Legenda de Utilidade

| Nível | Significado |
|-------|-------------|
| 🟢 **Alta** | Diretamente aplicável ao stack e necessidades atuais do projeto |
| 🟡 **Média** | Útil em cenários específicos ou parcialmente aplicável |
| 🔴 **Baixa** | Pouco ou nenhum valor agregado para o Primeiro Passo |

---

## 1. vercel-labs/skills/find-skills

**O que faz:** CLI e skill que ajuda a descobrir e instalar outras skills do ecossistema skills.sh. Funciona como um "buscador" de skills.

**Utilidade: 🟡 Média**

É uma meta-skill — útil como ferramenta de produtividade para o dev, não para o projeto em si. Ajuda a encontrar novas skills relevantes rapidamente pelo terminal. Vale instalar como utilitário geral, mas não impacta diretamente o código do Primeiro Passo.

---

## 2. anthropics/skills/frontend-design

**O que faz:** Guia a criação de interfaces frontend com design distinto e production-grade. Enfatiza tipografia marcante, paletas de cores com personalidade, e animações intencionais. Evita o visual genérico "AI slop".

**Utilidade: 🟢 Alta**

O Primeiro Passo já tem um design system definido (tema dark, accent lime/magenta, Inter + JetBrains Mono), mas esta skill seria extremamente útil para **evoluções de UI** e novas telas. Ela ajuda o agente a tomar decisões de design mais ousadas e consistentes, alinhadas com a identidade visual existente. Particularmente relevante para criar novas etapas ou componentes visuais.

---

## 3. vercel-labs/agent-skills/web-design-guidelines

**O que faz:** Audita código de UI contra as Web Interface Guidelines da Vercel. Cobre 100+ regras de acessibilidade, performance, UX, suporte a teclado, formulários e animações.

**Utilidade: 🟢 Alta**

O Primeiro Passo é uma SPA mobile-first com formulários complexos (briefing, upload de identidade visual), animações (Framer Motion), e navegação por slides com swipe. Esta skill seria valiosa para **auditorias de acessibilidade e UX** — especialmente nos quizzes de confirmação, na navegação entre etapas, e nos formulários de upload. Complementa bem o processo de QA antes de deploy.

---

## 4. vercel-labs/agent-browser/agent-browser

**O que faz:** Automação de browser para agentes AI. Ensina o workflow navigate → snapshot → interact → re-snapshot, incluindo gerenciamento de sessões, autenticação, diffing visual e screenshots anotadas.

**Utilidade: 🟡 Média**

Útil para **testes visuais e E2E automatizados** do fluxo de onboarding — por exemplo, validar que cada etapa renderiza corretamente, que quizzes bloqueiam a progressão quando incompletos, e que uploads funcionam. Não é core para o desenvolvimento, mas agrega valor significativo na camada de testes e QA visual.

---

## 5. anthropics/skills/skill-creator

**O que faz:** Cria, modifica e otimiza skills. Inclui execução de evals, benchmarking e otimização de descriptions para melhor triggering.

**Utilidade: 🟡 Média**

Relevante se vocês quiserem **criar skills customizadas** para o workflow da Aceleraí — por exemplo, uma skill específica para "deploy de Edge Functions" ou "criação de migração Supabase" que aplique automaticamente as regras do CLAUDE.md. Não tem impacto direto no Primeiro Passo, mas melhora a produtividade do time de desenvolvimento.

---

## 6. inferen-sh/skills/ai-image-generation

**O que faz:** Geração de imagens com 50+ modelos AI (FLUX, Gemini, Grok, Seedream) via CLI inference.sh. Suporta text-to-image, image-to-image, inpainting, upscaling e LoRA.

**Utilidade: 🟡 Média**

O Primeiro Passo tem um fluxo de "AI Campaign" (ai-step2/) que já gera imagens via `generate-ai-campaign-image`. Esta skill poderia **complementar ou substituir** o provider atual de geração de imagens, oferecendo mais modelos e opções. Também útil para gerar assets visuais para a própria interface (ilustrações das etapas, ícones customizados).

---

## 7. nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max

**O que faz:** Inteligência de design para UI/UX profissional em 10 stacks. Inclui 50+ estilos de design, 161 paletas de cores, 57 font pairings, 99 guidelines de UX, e um gerador de design system.

**Utilidade: 🟢 Alta**

Muito relevante para o Primeiro Passo. O app é React com Tailwind CSS — dois dos stacks cobertos. O Design System Generator pode ajudar a formalizar e expandir o design system existente (hoje em `design-tokens.js`). As guidelines de UX mobile seriam valiosas para melhorar a experiência em dispositivos móveis, que é o target principal do onboarding. Os 99 guidelines de UX com regras de acessibilidade e touch interaction são diretamente aplicáveis.

---

## 8. supabase/agent-skills/supabase-postgres-best-practices

**O que faz:** Guia de melhores práticas de Postgres para Supabase. Cobre 8 categorias de performance (queries, connection management, indexing, RLS, pooling), com exemplos de SQL correto vs. incorreto e análise de query plans.

**Utilidade: 🟢 Alta**

O Primeiro Passo inteiro roda sobre Supabase. O CLAUDE.md já documenta armadilhas como recursão infinita em RLS policies e padrões de helper functions. Esta skill **reforça e expande** essas práticas, sendo essencial para qualquer trabalho em migrations, novas policies, ou otimização de queries nas Edge Functions (`get-onboarding-data`, etc.). Recomendação forte de instalação.

---

## 9. shadcn/ui/shadcn

**O que faz:** Dá ao agente conhecimento profundo do shadcn/ui — lê a configuração do projeto (`components.json`), conhece 2500+ blocos/componentes, e sabe compor usando regras de composição (FieldGroup, ToggleGroup, cores semânticas).

**Utilidade: 🔴 Baixa**

O Primeiro Passo **não usa shadcn/ui**. O app usa componentes custom com design system próprio (design-tokens.js, componentes como PageLayout, NavButtons, QuizConfirmation, etc.). Instalar esta skill só faria sentido se houvesse um plano de migrar para shadcn/ui — o que não parece ser o caso dado o design system dark/lime já consolidado.

---

## 10. obra/superpowers/systematic-debugging

**O que faz:** Metodologia de debugging em 4 fases: investigação de root cause, análise de padrões, teste de hipóteses, e implementação com test cases obrigatórios. Bloqueia correções baseadas em sintomas e exige rastreamento backward da call stack.

**Utilidade: 🟢 Alta**

O Primeiro Passo integra com múltiplos sistemas (Supabase, Perplexity API, Edge Functions, webhooks). Bugs podem surgir em qualquer camada. Esta skill é **particularmente valiosa** para debugging de problemas como "tela branca pós-login" (mencionado no CLAUDE.md como causado por user_roles faltante), falhas na geração de briefing AI, ou problemas de upload de identidade visual. A regra de "parar e questionar a arquitetura após 3 tentativas falhas" é excelente para sistemas complexos.

---

## 11. obra/superpowers/writing-plans

**O que faz:** Aplica TDD (Test-Driven Development) à criação de planos e documentação de processos. Escreve cenários de teste (pressão com subagents), observa falhas, escreve a skill/doc, valida, e refatora.

**Utilidade: 🟡 Média**

O projeto já segue uma convenção de plans em `plan/YYYY-MM-DD-slug.md`. Esta skill poderia **melhorar a qualidade dos planos** aplicando uma abordagem mais rigorosa e testável. Útil quando se planeja features complexas como novas integrações OMIE ou evolução do fluxo de checkout, mas não é essencial para o dia a dia do Primeiro Passo.

---

## 12. obra/superpowers/subagent-driven-development

**O que faz:** Executa planos disparando um subagent novo por tarefa, com revisão em duas fases (compliance com spec + qualidade de código) após cada entrega.

**Utilidade: 🟡 Média**

Interessante como metodologia de desenvolvimento, especialmente para features maiores do monorepo (que tem apps/onboarding, apps/omie, apps/checkout-cielo). O modelo de "subagent por tarefa + review dupla" pode melhorar a qualidade em PRs grandes. Mas exige um workflow disciplinado e funciona melhor com Claude Code CLI do que com Cowork.

---

## 13. anthropics/skills/canvas-design

**O que faz:** Cria arte visual de alta qualidade em PNG/PDF usando filosofia de design. Gera peças visuais com padrões, formas e composição de nível museu/revista.

**Utilidade: 🔴 Baixa**

O Primeiro Passo não precisa de geração de arte estática. Os assets visuais são logo do cliente, animações Lottie, e ícones Lucide. Esta skill seria mais útil para materiais de marketing da Aceleraí do que para o app de onboarding em si.

---

## 14. wshobson/agents/tailwind-design-system

**O que faz:** Framework de design system CSS-first para Tailwind v4. Migra configuração para CSS @theme blocks com variáveis nativas, OKLCH, component patterns com CVA, e acessibilidade.

**Utilidade: 🟢 Alta**

O Primeiro Passo usa **Tailwind CSS** e já tem um design system em JS (`design-tokens.js`, `colors.js`). Esta skill ajudaria a **modernizar e formalizar** o design system usando padrões nativos do Tailwind v4 — @theme blocks, CSS variables, variantes com CVA, e tokens semânticos. Seria uma evolução natural do sistema atual, especialmente para garantir consistência em novos componentes.

---

## 15. google-labs-code/stitch-skills/design-md

**O que faz:** Analisa telas de um projeto e gera um DESIGN.md capturando o design system em linguagem natural — paleta, tipografia, estilos de componentes, princípios de layout.

**Utilidade: 🟡 Média**

O conceito é interessante — extrair o design system implícito no código e documentá-lo. Para o Primeiro Passo, poderia gerar um DESIGN.md que captura as decisões visuais espalhadas entre `design-tokens.js`, `colors.js`, `global.css` e os componentes. Porém, é orientado ao ecosistema Stitch do Google Labs, então a integração pode não ser direta.

---

## 16. github/awesome-copilot/create-agentsmd

**O que faz:** Coleção de skills da comunidade GitHub Copilot. `create-agentsmd` ajuda a criar arquivos AGENTS.md para repositórios — instruções para agentes AI trabalharem no codebase.

**Utilidade: 🟡 Média**

O projeto já tem CLAUDE.md robusto e AGENTS.md em `apps/omie/` e `apps/checkout-cielo/`. Esta skill poderia ajudar a **criar/atualizar AGENTS.md** para `apps/onboarding/`, garantindo que agentes AI tenham contexto específico do Primeiro Passo ao trabalhar no código. Útil como complemento, não como essencial.

---

## Resumo Executivo

### Recomendação de Instalação Prioritária (🟢 Alta)

| # | Skill | Por quê |
|---|-------|---------|
| 2 | **frontend-design** | Evolução de UI com design distinto |
| 3 | **web-design-guidelines** | Auditoria de acessibilidade e UX |
| 7 | **ui-ux-pro-max** | Design system generator + guidelines mobile |
| 8 | **supabase-postgres-best-practices** | Core do backend é Supabase |
| 10 | **systematic-debugging** | Debugging rigoroso em sistema multi-camada |
| 14 | **tailwind-design-system** | Modernização do design system Tailwind |

### Vale Considerar (🟡 Média)

| # | Skill | Cenário |
|---|-------|---------|
| 1 | **find-skills** | Utilitário geral para descobrir skills |
| 4 | **agent-browser** | Testes visuais e E2E |
| 5 | **skill-creator** | Criar skills customizadas para a Aceleraí |
| 6 | **ai-image-generation** | Complemento para geração de imagens AI |
| 11 | **writing-plans** | Planos de features mais rigorosos |
| 12 | **subagent-driven-development** | Features grandes com review estruturada |
| 15 | **design-md** | Documentar design system existente |
| 16 | **create-agentsmd** | AGENTS.md para apps/onboarding |

### Menor Prioridade (🔴 Baixa)

| # | Skill | Razão |
|---|-------|-------|
| 9 | **shadcn/ui** | Projeto não usa shadcn/ui |
| 13 | **canvas-design** | Não gera arte estática no onboarding |
